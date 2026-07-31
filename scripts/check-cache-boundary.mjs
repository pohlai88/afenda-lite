import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const CACHE_PACKAGE = "packages/runtime/cache";
const AUTHORIZED_EXPORTS = new Set([".", "./testing"]);
const AUTHORIZED_WORKSPACE_DEPENDENCIES = new Set([
	"@afenda/env",
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
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/cache\/(?!testing["'])/;
const RAW_KEY =
	/\bcache\.(?:get|set|delete|getOrLoad)\s*(?:<[^>]+>)?\s*\(\s*["'`]/;
const PRIVATE_PREFIX = /@afenda\/cache:v\d+:/;
const FLUSH_DATABASE = /\b(?:flushdb|flushall|FLUSHDB|FLUSHALL)\b/;
const LEGACY_SURFACES = [
	"CacheManager",
	"createCacheManager",
	"resolveCacheBackend",
	"CacheKeys",
	"CacheTTL",
	"CacheL2Store",
	"invalidateByPattern",
	"RequestDeduplicator",
	"BatchLoader",
	"encodeCursor",
	"decodeCursor",
];

function posix(value) {
	return value.replaceAll("\\", "/");
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
		violations.push(`${rel}: prohibited @afenda/cache subpath`);
	}
	if (RAW_KEY.test(source)) {
		violations.push(`${rel}: consumer constructs a raw cache key`);
	}
	if (PRIVATE_PREFIX.test(source)) {
		violations.push(`${rel}: consumer knows the private cache prefix`);
	}
	if (FLUSH_DATABASE.test(source)) {
		violations.push(`${rel}: shared Redis database flush is forbidden`);
	}
	for (const legacy of LEGACY_SURFACES) {
		if (source.includes(legacy)) {
			violations.push(`${rel}: deleted cache surface ${legacy}`);
		}
	}
}

export function checkCacheBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, CACHE_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${CACHE_PACKAGE}/package.json: only root and testing exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${CACHE_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
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
				rel.startsWith(`${CACHE_PACKAGE}/`) ||
				rel.startsWith("scripts/check-cache-boundary")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkCacheBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-cache-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-cache-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
