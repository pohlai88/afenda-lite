import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const dbPackage = "packages/data-plane/db";
const auditRoots = ["apps", "packages", "scripts", "testing"];
const skippedDirectories = new Set([
	"node_modules",
	".git",
	".next",
	".turbo",
	"dist",
	"build",
	"coverage",
]);
const sourceExtensions = new Set([
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".mjs",
]);
const legacyRuntimeNames = new Set([
	"db",
	"runNeonHttpTransaction",
	"orgWhere",
	"tenantEntityPredicate",
	"withOrg",
	"PlatformPermissionCodeV1",
	"PLATFORM_PERMISSION_CODES_V1",
	"PLATFORM_PERMISSION_V1",
	"PLATFORM_ROLE_TEMPLATES_V1",
	"ensurePlatformPermissionCatalog",
	"isPlatformPermissionCodeV1",
	"HARD_TENANT_ROOT_TABLE_NAMES",
	"HARD_TENANT_ROOT_TABLES",
]);
const NAMED_IMPORT_BLOCK_PATTERN = /\{([\s\S]*?)\}/u;
const TYPE_IMPORT_PREFIX_PATTERN = /^type\s+/u;
const IMPORT_ALIAS_PATTERN = /\s+as\s+/u;
const DB_SUBPATH_IMPORT_PATTERN =
	/(?:from\s*|import\s*\()\s*["']@afenda\/db\/(?!module-manifest["'])/u;
const RELATIVE_DB_INTERNAL_IMPORT_PATTERN =
	/(?:from\s*["']|import\s*\(\s*["'])[^"']*packages\/data-plane\/db\/src/u;
const DB_ROOT_IMPORT_PATTERN =
	/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+["']@afenda\/db["']/gu;
const DATABASE_FACADE_EXPORT_PATTERN =
	/export\s+\{\s*database\s*\}\s+from\s+["']\.\/capabilities\/database["']/u;
const violations = [];

function normalized(pathname) {
	return relative(root, pathname).replaceAll("\\", "/");
}

function extension(name) {
	const index = name.lastIndexOf(".");
	return index < 0 ? "" : name.slice(index);
}

function importedNames(clause) {
	const named = clause.match(NAMED_IMPORT_BLOCK_PATTERN)?.[1] ?? "";
	return named
		.split(",")
		.map(
			(entry) =>
				entry
					.trim()
					.replace(TYPE_IMPORT_PREFIX_PATTERN, "")
					.split(IMPORT_ALIAS_PATTERN)[0],
		)
		.filter(Boolean);
}

function checkFile(pathname) {
	const rel = normalized(pathname);
	if (rel === "scripts/check-db-boundary.test.mjs") {
		return;
	}
	const content = readFileSync(pathname, "utf8");
	const isDbPackage = rel.startsWith(`${dbPackage}/`);

	if (!isDbPackage && DB_SUBPATH_IMPORT_PATTERN.test(content)) {
		violations.push(`${rel}: unpublished @afenda/db subpath import`);
	}
	if (
		!isDbPackage &&
		RELATIVE_DB_INTERNAL_IMPORT_PATTERN.test(content.replaceAll("\\", "/"))
	) {
		violations.push(`${rel}: relative import into @afenda/db internals`);
	}
	if (isDbPackage) {
		return;
	}

	for (const match of content.matchAll(DB_ROOT_IMPORT_PATTERN)) {
		for (const name of importedNames(match[1] ?? "")) {
			if (legacyRuntimeNames.has(name)) {
				violations.push(`${rel}: legacy @afenda/db root import ${name}`);
			}
		}
	}
}

function walk(directory) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
	}
	for (const name of entries) {
		if (skippedDirectories.has(name)) {
			continue;
		}
		const pathname = join(directory, name);
		const stats = statSync(pathname);
		if (stats.isDirectory()) {
			walk(pathname);
		} else if (stats.isFile() && sourceExtensions.has(extension(name))) {
			checkFile(pathname);
		}
	}
}

for (const auditRoot of auditRoots) {
	walk(join(root, auditRoot));
}

const barrel = readFileSync(join(root, dbPackage, "src/index.ts"), "utf8");
if (!DATABASE_FACADE_EXPORT_PATTERN.test(barrel)) {
	violations.push(
		`${dbPackage}/src/index.ts: missing permanent database facade export`,
	);
}
for (const name of legacyRuntimeNames) {
	const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	if (new RegExp(`\\b${escaped}\\b`, "u").test(barrel)) {
		violations.push(
			`${dbPackage}/src/index.ts: legacy runtime name remains exported: ${name}`,
		);
	}
}

if (violations.length > 0) {
	console.error("check-db-boundary: FAIL");
	for (const violation of violations.toSorted()) {
		console.error(`  - ${violation}`);
	}
	process.exit(1);
}

console.log("check-db-boundary: ok");
