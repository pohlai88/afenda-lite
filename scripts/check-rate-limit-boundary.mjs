import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const RATE_LIMIT_PACKAGE = "packages/runtime/rate-limit";
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
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/rate-limit\/(?!testing["'])/;
const UPSTASH_LIMITER_BYPASS = /from\s+["']@upstash\/ratelimit["']/;
const RAW_KEY_INPUT = /rateLimit\.check\s*\(\s*\{[\s\S]{0,600}?\bkey\s*:/;
const RAW_DECISION_INTERPRETATION =
	/\b(?:limit|decision|rateLimitResult)\.(?:quota|reason|retryAfterSeconds)\b/;
const LEGACY_SURFACES = [
	"checkRateLimit",
	"toRateLimitFailure",
	"RateLimitStore",
	"RateLimitHitResult",
	"BUCKET_POLICIES",
	"RATE_LIMIT_BUCKETS",
	"createMemoryRateLimitStore",
	"createUpstashRateLimitStore",
	"resolveRateLimitBackend",
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
		violations.push(`${rel}: prohibited @afenda/rate-limit subpath`);
	}
	if (UPSTASH_LIMITER_BYPASS.test(source)) {
		violations.push(`${rel}: direct Upstash rate-limit vendor bypass`);
	}
	if (RAW_KEY_INPUT.test(source)) {
		violations.push(`${rel}: consumer constructs a raw rate-limit key`);
	}
	if (RAW_DECISION_INTERPRETATION.test(source)) {
		violations.push(`${rel}: consumer interprets private quota state`);
	}
	for (const legacy of LEGACY_SURFACES) {
		if (source.includes(legacy)) {
			violations.push(`${rel}: deleted rate-limit surface ${legacy}`);
		}
	}
}

export function checkRateLimitBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, RATE_LIMIT_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${RATE_LIMIT_PACKAGE}/package.json: only root and testing exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (
			dependency.startsWith("@afenda/") &&
			!AUTHORIZED_WORKSPACE_DEPENDENCIES.has(dependency)
		) {
			violations.push(
				`${RATE_LIMIT_PACKAGE}/package.json: unauthorized workspace dependency ${dependency}`,
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
				rel.startsWith(`${RATE_LIMIT_PACKAGE}/`) ||
				rel.startsWith("scripts/check-rate-limit-boundary")
			) {
				return;
			}
			checkConsumer(rel, readFileSync(file, "utf8"), violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkRateLimitBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-rate-limit-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-rate-limit-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
