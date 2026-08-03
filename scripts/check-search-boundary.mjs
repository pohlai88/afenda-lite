import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isGovernanceFixture } from "./lib/repository-walk.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const SEARCH_PACKAGE = "packages/data-plane/search";
const AUTHORIZED_EXPORTS = new Set([".", "./testing"]);
const AUTHORIZED_WORKSPACE_DEPENDENCIES = new Set([
	"@afenda/db",
	"@afenda/errors",
]);
const SOURCE_EXTENSIONS = new Set([
	".cts",
	".js",
	".mjs",
	".mts",
	".ts",
	".tsx",
]);
const SKIPPED = new Set([
	".git",
	".next",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/search\/(?!testing["'])/;
const TESTING_IMPORT = /from\s+["']@afenda\/search\/testing["']/;
const SEARCH_IMPORT = /from\s+["']@afenda\/search(?:\/testing)?["']/;
const RAW_ENTITY =
	/\bentity\s*:\s*["'`](?:md_|member|invite|human_resources_employee)/;
const DIRECT_TABLE = /\b(?:platformSearchDocument|platform_search_document)\b/;
const RANKING_INTERPRETATION =
	/\b(?:ts_rank(?:_cd)?|to_tsvector|plainto_tsquery)\s*\(/;
const TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.[^.]+$/;
const LEGACY_SURFACES = [
	"MemorySearchStore",
	"SearchStore",
	"DrizzleSearchStore",
	"createDrizzleSearchStore",
	"upsertSearchDocument",
	"upsertSearchDocuments",
	"deleteSearchDocument",
	"listSearchDocumentIds",
	"searchDocuments",
	"sanitizeSearchMetadata",
];

function posix(value) {
	return value.replaceAll("\\", "/");
}
function isTestFile(rel) {
	return rel.includes("/__tests__/") || TEST_FILE.test(rel);
}
function walk(directory, visit) {
	if (!existsSync(directory)) {
		return;
	}
	for (const name of readdirSync(directory)) {
		if (SKIPPED.has(name)) {
			continue;
		}
		const file = join(directory, name);
		const stats = statSync(file);
		if (stats.isDirectory()) {
			walk(file, visit);
		} else if (stats.isFile()) {
			visit(file);
		}
	}
}

function checkConsumer(rel, source, violations) {
	if (PROHIBITED_SUBPATH.test(source)) {
		violations.push(`${rel}: prohibited @afenda/search subpath`);
	}
	if (TESTING_IMPORT.test(source) && !isTestFile(rel)) {
		violations.push(
			`${rel}: production source imports search testing capability`,
		);
	}
	if (SEARCH_IMPORT.test(source) && RAW_ENTITY.test(source)) {
		violations.push(`${rel}: consumer owns a search entity string`);
	}
	if (
		(rel.startsWith("apps/") || rel.startsWith("packages/")) &&
		!isTestFile(rel) &&
		DIRECT_TABLE.test(source)
	) {
		violations.push(`${rel}: direct platform_search_document access`);
	}
	if (RANKING_INTERPRETATION.test(source)) {
		violations.push(`${rel}: consumer interprets search ranking`);
	}
	for (const legacy of LEGACY_SURFACES) {
		if (source.includes(legacy)) {
			violations.push(`${rel}: deleted search surface ${legacy}`);
		}
	}
}

export function checkSearchBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, SEARCH_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${SEARCH_PACKAGE}/package.json: only root and testing exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${SEARCH_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
			);
		}
	}
	for (const sourceRoot of ["apps", "packages", "scripts"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			if (
				rel.startsWith(`${SEARCH_PACKAGE}/`) ||
				rel.startsWith("packages/data-plane/db/") ||
				isGovernanceFixture(rel) ||
				// The detector's own source carries every forbidden pattern as data.
				rel.startsWith("scripts/check-search-boundary")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkSearchBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-search-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-search-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
