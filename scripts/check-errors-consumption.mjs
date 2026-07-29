import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ERRORS_PACKAGE = "packages/foundation/errors";
const AUDIT_ROOTS = [
	"apps",
	"packages",
	"scripts",
	"testing",
	".cursor",
	"docs-V2",
];
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
	"_reference",
]);
const AUDIT_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".md",
	".mdx",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const DOCUMENTATION_EXTENSIONS = new Set([".md", ".mdx"]);
const PUBLISHED_ERRORS_SUBPATHS = new Set([
	"result",
	"http",
	"common",
	"adapters/postgres",
]);

const protectedDefinitions = [
	[/\bclass\s+AppError\b/u, "AppError"],
	[/^\s*(?:export\s+)?type\s+Result(?:<[^>]+>)?\s*=/mu, "Result<T>"],
	[
		/^\s*(?:export\s+)?interface\s+Result(?:<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{/mu,
		"Result<T>",
	],
	[/\b(?:export\s+)?const\s+ERROR_CODES\b/u, "ERROR_CODES"],
	[/\b(?:export\s+)?const\s+API_ERROR_CODES\b/u, "API_ERROR_CODES"],
	[/\b(?:export\s+)?const\s+ERROR_HTTP_STATUS\b/u, "ERROR_HTTP_STATUS"],
	[/\b(?:export\s+)?const\s+API_ERROR_HTTP_STATUS\b/u, "API_ERROR_HTTP_STATUS"],
	[/\b(?:export\s+)?function\s+httpErrorBody\b/u, "httpErrorBody"],
	[/\b(?:export\s+)?const\s+apiErrorBody\b/u, "apiErrorBody"],
	[/\b(?:export\s+)?function\s+retryAfterSeconds\b/u, "retryAfterSeconds"],
	[/\b(?:export\s+)?function\s+normalizeUnknown\b/u, "normalizeUnknown"],
	[/\b(?:export\s+)?function\s+serializeAppError\b/u, "serializeAppError"],
	[/\b(?:export\s+)?function\s+serializeUnknown\b/u, "serializeUnknown"],
	[/\b(?:export\s+)?function\s+fromPostgresUnknown\b/u, "fromPostgresUnknown"],
	[/\b(?:export\s+)?function\s+postgresSqlState\b/u, "postgresSqlState"],
	[/\b(?:export\s+)?function\s+hasPostgresSqlState\b/u, "hasPostgresSqlState"],
	[/\bfunction\s+readSqlState\b/u, "Postgres SQLSTATE parser"],
	[/\bconst\s+SQLSTATE_PATTERN\b/u, "Postgres SQLSTATE parser"],
	[/\bconst\s+SQLSTATE_MAP\b/u, "Postgres SQLSTATE mapper"],
	[
		/^\s*export\s+function\s+(?:badRequest|unauthorized|forbidden|notFound|conflict|validationError|rateLimited|serviceUnavailable|internalError)\b[^{]*\):\s*AppError\b/mu,
		"shared failure factory",
	],
];

const forbiddenDirectImportPrefixes = [
	"packages/data-plane/db/src/schema/",
	"packages/data-plane/db/drizzle/",
	"packages/surfaces/ui-system/src/components/",
	"packages/surfaces/ui-system/src/metadata/",
];

const DOCUMENTATION_DRIFT_DEFINITIONS = [
	[
		/\b(?:ErrorCodeBrand|ApiErrorCodeBrand|asErrorCode|asApiErrorCode)\b/u,
		"stale error brand or conversion helper documentation",
	],
	[
		/@afenda\/errors\/(?:core|src|safe-details|codes|normalize|serialize|app-error)(?:\b|\/)/u,
		"obsolete internal @afenda/errors import example",
	],
	[
		/(?:Response|NextResponse)\.json\s*\(\s*error\s*\)/u,
		"documentation suggests direct public serialization of raw error objects",
	],
	[
		/(?:\b(?:package|boundary|public)\b[^\n]{0,160}\bthrow\s+new\s+Error\b|\bthrow\s+new\s+Error\b[^\n]{0,160}\b(?:package|boundary|public)\b)/iu,
		"documentation suggests throwing raw Error across a public/package boundary",
	],
];

/** @type {{file: string; auditCategory: "DUPLICATE" | "UNSAFE" | "STALE_DOCUMENTATION"; message: string}[]} */
const violations = [];

function normalizedRelative(pathname) {
	return relative(root, pathname).replace(/\\/g, "/");
}

function extensionFor(name) {
	const index = name.lastIndexOf(".");
	return index >= 0 ? name.slice(index) : "";
}

function isAuditFile(name) {
	return AUDIT_EXTENSIONS.has(extensionFor(name));
}

function isSourceFile(name) {
	return SOURCE_EXTENSIONS.has(extensionFor(name));
}

function isDocumentationFile(name) {
	return DOCUMENTATION_EXTENSIONS.has(extensionFor(name));
}

function isTestLikePath(rel) {
	return (
		rel.includes("/__tests__/") ||
		rel.includes("/testing/") ||
		/\.(?:test|spec)\.[cm]?tsx?$/u.test(rel)
	);
}

function walk(directory) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
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
			walk(fullPath);
			continue;
		}

		if (stats.isFile() && isAuditFile(name)) {
			checkFile(fullPath);
		}
	}
}

function errorsSubpathImports(content) {
	return [...content.matchAll(/@afenda\/errors\/([^"'\s`)]+)/gu)].map(
		(match) => match[1],
	);
}

function checkFile(fullPath) {
	const rel = normalizedRelative(fullPath);
	const content = readFileSync(fullPath, "utf8");
	const isErrorsPackage = rel.startsWith(`${ERRORS_PACKAGE}/`);
	const isSource = isSourceFile(rel);
	const isDocumentation = isDocumentationFile(rel);

	if (isSource && !isErrorsPackage && !isTestLikePath(rel)) {
		for (const [pattern, symbol] of protectedDefinitions) {
			if (pattern.test(content)) {
				violations.push({
					file: rel,
					auditCategory: "DUPLICATE",
					message: `competing shared error-kernel definition: ${symbol}`,
				});
			}
		}
	}

	if (!isErrorsPackage) {
		for (const subpath of errorsSubpathImports(content)) {
			if (!PUBLISHED_ERRORS_SUBPATHS.has(subpath)) {
				violations.push({
					file: rel,
					auditCategory: isDocumentation ? "STALE_DOCUMENTATION" : "UNSAFE",
					message: `unpublished @afenda/errors subpath import: @afenda/errors/${subpath}`,
				});
			}
		}
	}

	if (isDocumentation && !isErrorsPackage) {
		for (const [pattern, message] of DOCUMENTATION_DRIFT_DEFINITIONS) {
			if (pattern.test(content)) {
				violations.push({
					file: rel,
					auditCategory: "STALE_DOCUMENTATION",
					message,
				});
			}
		}
	}

	if (
		isSource &&
		forbiddenDirectImportPrefixes.some((prefix) => rel.startsWith(prefix)) &&
		/from\s+["']@afenda\/errors(?:\/[^"']*)?["']/u.test(content)
	) {
		violations.push({
			file: rel,
			auditCategory: "UNSAFE",
			message:
				"forbidden direct @afenda/errors import in schema, migration, or reusable UI primitive surface",
		});
	}
}

for (const auditRoot of AUDIT_ROOTS) {
	walk(join(root, auditRoot));
}

if (violations.length > 0) {
	console.error("check-errors-consumption: FAIL");
	for (const violation of violations) {
		console.error(
			`  - ${violation.auditCategory} ${violation.file}: ${violation.message}`,
		);
	}
	process.exit(1);
}

console.log("check-errors-consumption: ok");
