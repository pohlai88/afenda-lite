/**
 * pnpm check:env-consumers — environment consumer ownership gate (ENV-GOV-1 B).
 *
 * TypeScript/JavaScript rules are evaluated over the AST, not over text. A
 * regex checker fails *silently* when syntax changes: the pattern stops
 * matching, the gate still exits 0, and nobody learns that coverage dropped.
 * Parsing makes the checker fail loudly instead, and lets it see forms text
 * matching cannot — destructuring, aliasing, `export * from`, and `require`.
 *
 * Deliberately syntactic only (no type checker): these are lexical-ownership
 * rules, and a full program build would cost minutes for no extra fidelity.
 *
 * Not everything moves to AST. `.env` file governance is a git-tracking
 * question, not a syntax one, and stays a file-list check — "replace regex with
 * AST" is not a universal rule, only the right one per format.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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

/** Modules and helpers that load environment outside the governed schema. */
const ENV_LOADER_MODULES = new Set(["dotenv", "dotenv/config", "dotenv-flow"]);
const ENV_LOADER_IDENTIFIERS = new Set(["loadEnvConfig", "envsafe", "envalid"]);

/** Historical names superseded by governed keys. */
const LEGACY_ENV_ALIASES = new Set([
	"POSTGRES_URL",
	"POSTGRES_PRISMA_URL",
	"NEON_DATABASE_URL",
	"NEXTAUTH_URL",
	"AUTH_URL",
	"PUBLIC_APP_URL",
	"REDIS_URL",
	"UPSTASH_URL",
]);

const PRODUCT_ENV_SPECIFIER = "@afenda/env";
const BYPASS_VARIABLE = "SKIP_ENV_VALIDATION";

/**
 * Named owners of the validation bypass, with the reason each needs it.
 *
 * Deliberately a named list rather than a broad category such as "any test":
 * a product test reading the bypass is exactly the drift worth catching, while
 * the authority's own suite must be able to exercise it.
 */
const BYPASS_OWNER_PREFIXES = new Map([
	[
		"packages/foundation/env/src/",
		"Authority implements the bypass and owns its semantics.",
	],
	[
		"packages/foundation/env/__tests__/",
		"Authority's own suite must exercise bypass and non-bypass paths.",
	],
]);

/**
 * Framework/platform identity keys.
 *
 * These describe *where the process is running*, not product configuration, so
 * they are not the thing `@afenda/env` exists to type. The list is deliberately
 * closed and small: everything outside it is product config and must go through
 * the governed schema.
 *
 * Each key names the consumer categories allowed to read it. Scoping matters:
 * `NODE_ENV` in a framework config is reasonable, while `NODE_ENV` branching
 * scattered through business packages is the drift this gate should still
 * catch. A globally unconditional allowlist would permit both.
 */
const PLATFORM_ENV_KEYS = new Map([
	[
		"NODE_ENV",
		{
			owners: ["framework-config", "repository-tooling", "env-authority"],
			reason: "Build/runtime mode, not product configuration.",
		},
	],
	[
		"VERCEL_ENV",
		{
			owners: ["framework-config", "repository-tooling", "env-authority"],
			reason: "Deployment environment identity.",
		},
	],
	[
		"CI",
		{
			owners: ["framework-config", "repository-tooling", "env-authority"],
			reason: "Continuous-integration detection.",
		},
	],
	[
		"npm_lifecycle_event",
		{
			owners: ["repository-tooling", "env-authority"],
			reason: "Package-manager script identity.",
		},
	],
]);

/** Consumer category of a file, for platform-key scoping. */
function consumerCategory(relativePath) {
	if (isEnvAuthority(relativePath)) {
		return "env-authority";
	}
	if (isFrameworkBootstrap(relativePath)) {
		return "framework-config";
	}
	if (isOperatorTooling(relativePath)) {
		return "repository-tooling";
	}
	return "product";
}

function platformKeyAllowed(variable, relativePath) {
	const policy = PLATFORM_ENV_KEYS.get(variable);
	return policy?.owners.includes(consumerCategory(relativePath)) ?? false;
}

function ownsValidationBypass(relativePath) {
	for (const prefix of BYPASS_OWNER_PREFIXES.keys()) {
		if (relativePath.startsWith(prefix)) {
			return true;
		}
	}
	return false;
}

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
		"packages/erp/inventory/src/composition/reconcile-cli.ts",
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
		relativePath.endsWith("/next.config.ts") ||
		// Storybook builder configuration is framework config in the same sense as
		// next.config: it runs at build time to assemble the toolchain.
		relativePath.includes("/.storybook/")
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

/* ---------------------------------------------------------------- AST utils */

function parseSource(relativePath, content) {
	return ts.createSourceFile(
		relativePath,
		content,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ true,
		relativePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

function lineOf(sourceFile, node) {
	return (
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
	);
}

/** True for the expression `process.env`. */
function isProcessEnv(node) {
	return (
		ts.isPropertyAccessExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === "process" &&
		node.name.text === "env"
	);
}

/** Static string value of a module specifier or index argument, if literal. */
function literalText(node) {
	if (!node) {
		return;
	}
	if (ts.isStringLiteralLike(node)) {
		return node.text;
	}
}

/** Module specifier of any import form: static, dynamic, require, or re-export. */
function moduleSpecifierOf(node) {
	if (
		(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
		node.moduleSpecifier
	) {
		return literalText(node.moduleSpecifier);
	}
	if (ts.isCallExpression(node)) {
		const isDynamicImport =
			node.expression.kind === ts.SyntaxKind.ImportKeyword;
		const isRequire =
			ts.isIdentifier(node.expression) && node.expression.text === "require";
		if (isDynamicImport || isRequire) {
			return literalText(node.arguments[0]);
		}
	}
}

/* ------------------------------------------------------------ env-read scan */

/**
 * Every environment variable read in the file.
 *
 * Covers the forms a property-access-only check misses:
 *   process.env.KEY            direct access
 *   process.env["KEY"]         indexed access
 *   const { KEY } = process.env  destructuring
 *   const e = process.env; e.KEY  aliasing (single-level binding analysis)
 *   fn(process.env)            whole-object escape
 */
function collectEnvReads(sourceFile) {
	const reads = [];
	const aliases = new Set();

	// Pass 1 — alias bindings and destructuring.
	const visitBindings = (node) => {
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			isProcessEnv(node.initializer)
		) {
			if (ts.isIdentifier(node.name)) {
				aliases.add(node.name.text);
			} else if (ts.isObjectBindingPattern(node.name)) {
				for (const element of node.name.elements) {
					const key = element.propertyName ?? element.name;
					if (ts.isIdentifier(key)) {
						reads.push({ variable: key.text, node: element });
					}
				}
			}
		}
		ts.forEachChild(node, visitBindings);
	};
	visitBindings(sourceFile);

	/** Reads `process.env` or an alias of it as the access base. */
	const readsEnvObject = (expression) =>
		isProcessEnv(expression) ||
		(ts.isIdentifier(expression) && aliases.has(expression.text));

	/**
	 * `process.env` used as a value rather than as an access base — the whole
	 * object is captured or escapes, so every key is potentially read.
	 *
	 * Capture (`const e = process.env`) counts. That is what makes single-level
	 * alias tracking sufficient: an arbitrary alias chain (`a = env; b = a; …`)
	 * or a `function getEnv() { return process.env }` factory is already a
	 * violation at its first capture, so the checker never needs a homemade
	 * data-flow engine to follow it.
	 *
	 * Checked independently of the access branches below: `process.env` is
	 * itself a PropertyAccessExpression, so an `else if` chain never reaches it.
	 */
	const isWholeObjectEscape = (node) => {
		if (!isProcessEnv(node)) {
			return false;
		}
		const { parent } = node;
		const isAccessBase =
			(ts.isPropertyAccessExpression(parent) ||
				ts.isElementAccessExpression(parent)) &&
			parent.expression === node;
		return !isAccessBase;
	};

	// Pass 2 — accesses on `process.env` and on any alias bound to it.
	const visitAccesses = (node) => {
		if (isWholeObjectEscape(node)) {
			reads.push({ variable: "*", node });
		} else if (
			ts.isPropertyAccessExpression(node) &&
			readsEnvObject(node.expression)
		) {
			reads.push({ variable: node.name.text, node });
		} else if (
			ts.isElementAccessExpression(node) &&
			readsEnvObject(node.expression)
		) {
			reads.push({
				variable: literalText(node.argumentExpression) ?? "*",
				node,
			});
		}
		ts.forEachChild(node, visitAccesses);
	};
	visitAccesses(sourceFile);

	return reads;
}

/* ------------------------------------------------------------- file analysis */

function analyzeSourceFile({ relativePath, content }) {
	const findings = [];
	let sourceFile;
	try {
		sourceFile = parseSource(relativePath, content);
	} catch {
		// A file the parser cannot read is reported rather than silently skipped:
		// silent skips are how coverage disappears.
		return [
			{
				category: "UNPARSEABLE_SOURCE",
				file: relativePath,
				line: 1,
				variable: "parse",
				message: "file could not be parsed for environment-consumer analysis",
			},
		];
	}

	const allowedReason = exceptionReason(relativePath);
	const envReads = collectEnvReads(sourceFile);

	for (const read of envReads) {
		if (
			allowedReason === undefined &&
			isRuntimePackageOrApp(relativePath) &&
			!platformKeyAllowed(read.variable, relativePath)
		) {
			findings.push({
				category: "RAW_PROCESS_ENV",
				file: relativePath,
				line: lineOf(sourceFile, read.node),
				variable: read.variable,
				message:
					"runtime product code must consume typed @afenda/env values or an injected package option",
			});
		}

		// The validation bypass belongs to the env authority alone. Anywhere else
		// it is a way to make configuration errors disappear at runtime.
		if (
			read.variable === BYPASS_VARIABLE &&
			!ownsValidationBypass(relativePath)
		) {
			findings.push({
				category: "ENV_VALIDATION_BYPASS",
				file: relativePath,
				line: lineOf(sourceFile, read.node),
				variable: BYPASS_VARIABLE,
				message:
					"SKIP_ENV_VALIDATION may only be read inside @afenda/env authority modules",
			});
		}
	}

	const visit = (node) => {
		// Competing environment schema construction.
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === "createEnv" &&
			!isEnvAuthority(relativePath) &&
			!isTestLikePath(relativePath)
		) {
			findings.push({
				category: "COMPETING_CREATE_ENV",
				file: relativePath,
				line: lineOf(sourceFile, node),
				variable: "createEnv",
				message: "createEnv is only allowed in @afenda/env authority modules",
			});
		}

		// Direct env loaders, in any import form.
		const specifier = moduleSpecifierOf(node);
		if (
			specifier !== undefined &&
			ENV_LOADER_MODULES.has(specifier) &&
			!isFrameworkBootstrap(relativePath) &&
			!isOperatorTooling(relativePath) &&
			!isTestLikePath(relativePath)
		) {
			findings.push({
				category: "RUNTIME_ENV_LOADER",
				file: relativePath,
				line: lineOf(sourceFile, node),
				variable: "env-loader",
				message:
					"runtime packages must not load dotenv or framework env loaders directly",
			});
		}
		if (
			ts.isIdentifier(node) &&
			ENV_LOADER_IDENTIFIERS.has(node.text) &&
			!isFrameworkBootstrap(relativePath) &&
			!isOperatorTooling(relativePath) &&
			!isTestLikePath(relativePath)
		) {
			findings.push({
				category: "RUNTIME_ENV_LOADER",
				file: relativePath,
				line: lineOf(sourceFile, node),
				variable: "env-loader",
				message:
					"runtime packages must not load dotenv or framework env loaders directly",
			});
		}

		// Historical aliases, as identifiers or as string keys.
		const aliasName = ts.isIdentifier(node)
			? node.text
			: (literalText(node) ?? undefined);
		if (
			aliasName !== undefined &&
			LEGACY_ENV_ALIASES.has(aliasName) &&
			!isOperatorTooling(relativePath) &&
			!isTestLikePath(relativePath)
		) {
			findings.push({
				category: "LEGACY_ENV_ALIAS",
				file: relativePath,
				line: lineOf(sourceFile, node),
				variable: "legacy-alias",
				message:
					"legacy environment aliases are forbidden; use the governed @afenda/env key",
			});
		}

		// Docs app must never reach the product entrypoint — any import form.
		if (
			relativePath.startsWith("apps/docs/") &&
			specifier === PRODUCT_ENV_SPECIFIER &&
			!isTestLikePath(relativePath)
		) {
			findings.push({
				category: "DOCS_PRODUCT_ENV_IMPORT",
				file: relativePath,
				line: lineOf(sourceFile, node),
				variable: PRODUCT_ENV_SPECIFIER,
				message: "docs app must import docsEnv from @afenda/env/docs only",
			});
		}

		ts.forEachChild(node, visit);
	};
	visit(sourceFile);

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

/** `.env` governance is a tracking question — correctly a file-list check. */
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
			analyzeSourceFile({
				relativePath,
				content: readFileSync(absolutePath, "utf8"),
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
