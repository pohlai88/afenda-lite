import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const AUDIT_ROOTS = ["apps", "packages", "scripts", "testing"];
const SOURCE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".mjs",
	".cjs",
]);
const SKIP_DIR = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
	"test-results",
	"playwright-report",
	"storybook-static",
	"_reference",
	".pnpm-store-temp",
]);

const PROCESS_ENV_PATTERN =
	/process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*["']([^"']+)["']\s*\])?/gu;
const CREATE_ENV_PATTERN = /\bcreateEnv\s*\(/u;
const ENV_LOADER_PATTERN =
	/\b(?:dotenv\/config|import\s+[^;]+?\s+from\s+["']dotenv["']|require\s*\(\s*["']dotenv["']\s*\)|loadEnvConfig|envsafe|envalid)/u;
const LEGACY_ENV_ALIAS_PATTERN =
	/\b(?:POSTGRES_URL|POSTGRES_PRISMA_URL|NEON_DATABASE_URL|NEXTAUTH_URL|AUTH_URL|PUBLIC_APP_URL|REDIS_URL|UPSTASH_URL)\b/u;
const DOCS_PRODUCT_ENV_IMPORT_PATTERN =
	/from\s+["']@afenda\/env["']|import\s*\(\s*["']@afenda\/env["']\s*\)/u;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const FRAMEWORK_CONFIG_PATTERN =
	/(?:^|\/)(?:next|playwright(?:\.[\w-]+)?|vitest(?:\.[\w-]+)?|vercel|drizzle)\.config\.[cm]?[jt]s$/u;
const LINE_BREAK_PATTERN = /\r?\n/u;
const WINDOWS_SEPARATOR_PATTERN = /\\/g;
const ALLOWED_TRACKED_ENV_FILES = new Set([".env.example"]);

const APPROVED_RUNTIME_PROCESS_ENV_EXCEPTIONS = new Map([
	[
		"packages/data-plane/db/src/env.ts",
		"ARCH-024 forbids db -> @afenda/env; this is the DB package bootstrap boundary.",
	],
	[
		"packages/foundation/testing/src/require-database-for-ci.ts",
		"Test helper owns CI/database fixture environment.",
	],
	[
		"packages/erp/inventory/src/reconcile-cli.ts",
		"Operator CLI loads DATABASE_URL from env or local .env.local.",
	],
]);

function normalizedRelative(root, pathname) {
	return relative(root, pathname).replace(WINDOWS_SEPARATOR_PATTERN, "/");
}

function extensionFor(name) {
	const index = name.lastIndexOf(".");
	return index >= 0 ? name.slice(index) : "";
}

function isSourceFile(name) {
	return SOURCE_EXTENSIONS.has(extensionFor(name));
}

function isTestLikePath(relativePath) {
	return (
		relativePath.includes("/__tests__/") ||
		relativePath.includes("/test/") ||
		relativePath.includes("/tests/") ||
		relativePath.includes("/testing/") ||
		TEST_FILE_PATTERN.test(relativePath)
	);
}

function isFrameworkBootstrap(relativePath) {
	return (
		FRAMEWORK_CONFIG_PATTERN.test(relativePath) ||
		relativePath.endsWith("/next.config.mjs") ||
		relativePath.endsWith("/next.config.ts")
	);
}

function isEnvAuthority(relativePath) {
	return relativePath.startsWith("packages/foundation/env/src/");
}

function isOperatorTooling(relativePath) {
	return (
		relativePath.startsWith("scripts/") || relativePath.includes("/scripts/")
	);
}

function isRuntimePackageOrApp(relativePath) {
	return (
		relativePath.startsWith("apps/") || relativePath.startsWith("packages/")
	);
}

function exceptionReason(relativePath) {
	if (isEnvAuthority(relativePath)) {
		return "@afenda/env authority owns process.env runtimeEnv reads.";
	}
	if (isTestLikePath(relativePath)) {
		return "Test file or test helper owns its fixture environment.";
	}
	if (isFrameworkBootstrap(relativePath)) {
		return "Framework bootstrap runs before runtime env modules can safely load.";
	}
	if (isOperatorTooling(relativePath)) {
		return "Operator/repository tooling exception.";
	}
	return APPROVED_RUNTIME_PROCESS_ENV_EXCEPTIONS.get(relativePath);
}

function walk(directory, root, files = []) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return files;
	}

	for (const name of entries) {
		if (SKIP_DIR.has(name)) {
			continue;
		}

		const fullPath = join(directory, name);
		let stats;
		try {
			stats = statSync(fullPath);
		} catch {
			continue;
		}

		if (stats.isDirectory()) {
			walk(fullPath, root, files);
			continue;
		}

		if (stats.isFile() && isSourceFile(name)) {
			files.push({
				absolutePath: fullPath,
				relativePath: normalizedRelative(root, fullPath),
			});
		}
	}

	return files;
}

function processEnvMatches(content) {
	return [...content.matchAll(PROCESS_ENV_PATTERN)].map((match) => ({
		variable: match[1] ?? match[2] ?? "*",
		index: match.index ?? 0,
	}));
}

function stripComments(content) {
	return content
		.replace(/\/\*[\s\S]*?\*\//gu, (match) => " ".repeat(match.length))
		.replace(
			/(^|[^:])\/\/.*$/gmu,
			(match, prefix) => `${prefix}${" ".repeat(match.length - prefix.length)}`,
		);
}

function lineNumberFor(content, index) {
	return content.slice(0, index).split(LINE_BREAK_PATTERN).length;
}

function addFinding(findings, finding) {
	findings.push(finding);
}

function analyzeFile({ relativePath, content }) {
	const findings = [];
	const allowedReason = exceptionReason(relativePath);
	const envMatches = processEnvMatches(content);

	for (const match of envMatches) {
		if (allowedReason !== undefined) {
			continue;
		}
		if (isRuntimePackageOrApp(relativePath)) {
			addFinding(findings, {
				category: "RAW_PROCESS_ENV",
				file: relativePath,
				line: lineNumberFor(content, match.index),
				variable: match.variable,
				message:
					"runtime product code must consume typed @afenda/env values or an injected package option",
			});
		}
	}

	if (
		CREATE_ENV_PATTERN.test(content) &&
		!isEnvAuthority(relativePath) &&
		!isTestLikePath(relativePath)
	) {
		addFinding(findings, {
			category: "COMPETING_CREATE_ENV",
			file: relativePath,
			line: lineNumberFor(content, content.search(CREATE_ENV_PATTERN)),
			variable: "createEnv",
			message: "createEnv is only allowed in @afenda/env authority modules",
		});
	}

	if (
		ENV_LOADER_PATTERN.test(content) &&
		!isFrameworkBootstrap(relativePath) &&
		!isOperatorTooling(relativePath) &&
		!isTestLikePath(relativePath)
	) {
		addFinding(findings, {
			category: "RUNTIME_ENV_LOADER",
			file: relativePath,
			line: lineNumberFor(content, content.search(ENV_LOADER_PATTERN)),
			variable: "env-loader",
			message:
				"runtime packages must not load dotenv or framework env loaders directly",
		});
	}

	if (
		LEGACY_ENV_ALIAS_PATTERN.test(content) &&
		!isOperatorTooling(relativePath) &&
		!isTestLikePath(relativePath)
	) {
		addFinding(findings, {
			category: "LEGACY_ENV_ALIAS",
			file: relativePath,
			line: lineNumberFor(content, content.search(LEGACY_ENV_ALIAS_PATTERN)),
			variable: "legacy-alias",
			message:
				"legacy environment aliases are forbidden; use the governed @afenda/env key",
		});
	}

	if (
		relativePath.startsWith("apps/docs/") &&
		DOCS_PRODUCT_ENV_IMPORT_PATTERN.test(content) &&
		!isTestLikePath(relativePath)
	) {
		addFinding(findings, {
			category: "DOCS_PRODUCT_ENV_IMPORT",
			file: relativePath,
			line: lineNumberFor(
				content,
				content.search(DOCS_PRODUCT_ENV_IMPORT_PATTERN),
			),
			variable: "@afenda/env",
			message: "docs app must import docsEnv from @afenda/env/docs only",
		});
	}

	return findings;
}

function collectFiles(root) {
	return AUDIT_ROOTS.flatMap((auditRoot) => walk(join(root, auditRoot), root));
}

function listTrackedFiles(root) {
	const result = spawnSync("git", ["ls-files"], {
		cwd: root,
		encoding: "utf8",
	});

	if (result.status !== 0) {
		return [];
	}

	return result.stdout
		.split(LINE_BREAK_PATTERN)
		.filter((line) => line.length > 0);
}

function analyzeTrackedEnvFiles(root) {
	return listTrackedFiles(root)
		.filter((file) => {
			const basename = file.split("/").at(-1) ?? file;
			return basename.startsWith(".env");
		})
		.filter((file) => !ALLOWED_TRACKED_ENV_FILES.has(file))
		.map((file) => ({
			category: "COMMITTED_ENV_FILE",
			file,
			line: 1,
			variable: ".env",
			message:
				"only .env.example may be committed; local env files must stay ignored",
		}));
}

export function buildEnvConsumerReport(root = DEFAULT_ROOT) {
	const files = collectFiles(root);
	const findings = [
		...files.flatMap(({ absolutePath, relativePath }) =>
			analyzeFile({
				relativePath,
				content: stripComments(readFileSync(absolutePath, "utf8")),
			}),
		),
		...analyzeTrackedEnvFiles(root),
	];

	return {
		summary: {
			status: findings.length === 0 ? "ok" : "fail",
			files: files.length,
			findings: findings.length,
		},
		findings,
	};
}

export function formatEnvConsumerReport(report) {
	if (report.findings.length === 0) {
		return `check-env-consumers: ok (${report.summary.files} files scanned)`;
	}

	return [
		"check-env-consumers: FAIL",
		...report.findings.map(
			(finding) =>
				`  - ${finding.category} ${finding.file}:${finding.line} ${finding.variable}: ${finding.message}`,
		),
	].join("\n");
}

export function runCli(root = DEFAULT_ROOT) {
	const report = buildEnvConsumerReport(root);
	const output = formatEnvConsumerReport(report);
	if (report.summary.status === "fail") {
		console.error(output);
		return 1;
	}
	console.log(output);
	return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exitCode = runCli();
}
