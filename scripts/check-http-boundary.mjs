import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const HTTP_PACKAGE = "packages/runtime/http";
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
const LEGACY_SURFACES = [
	"AUTH_BFF_CORRELATION_HEADER",
	"resolveAuthBffCorrelationId",
	"createCorrelationId",
	"resolveCorrelationId",
	"applyRateLimitHeaders",
	"applyRetryAfterHeader",
	"applyServerTimingHeader",
	"extractPagination",
	"withHttpContext",
	"stampHttpResponse",
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

export function checkHttpBoundary(root) {
	const violations = [];
	const manifestPath = join(root, HTTP_PACKAGE, "package.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const exports = Object.keys(manifest.exports ?? {});
	if (exports.length !== 1 || exports[0] !== ".") {
		violations.push(
			`${HTTP_PACKAGE}/package.json: only the root export is authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (dependency.startsWith("@afenda/")) {
			violations.push(
				`${HTTP_PACKAGE}/package.json: leaf has runtime workspace dependency ${dependency}`,
			);
		}
	}
	const index = readFileSync(join(root, HTTP_PACKAGE, "src/index.ts"), "utf8");
	if (!index.includes("export const http = Object.freeze")) {
		violations.push(
			`${HTTP_PACKAGE}/src/index.ts: missing permanent http capability`,
		);
	}
	if (/export\s+(?:const|function|class)\s+(?!http\b)/.test(index)) {
		violations.push(
			`${HTTP_PACKAGE}/src/index.ts: root exposes a second runtime capability`,
		);
	}

	for (const sourceRoot of ["apps", "packages"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			const source = readFileSync(file, "utf8");
			if (/from\s+["']@afenda\/http\//.test(source)) {
				violations.push(`${rel}: deep @afenda/http import`);
			}
			if (!rel.startsWith(`${HTTP_PACKAGE}/`)) {
				for (const legacy of LEGACY_SURFACES) {
					if (source.includes(legacy)) {
						violations.push(`${rel}: deleted HTTP surface ${legacy}`);
					}
				}
			}
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkHttpBoundary(REPOSITORY_ROOT);
	if (violations.length) {
		console.error("check-http-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-http-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
