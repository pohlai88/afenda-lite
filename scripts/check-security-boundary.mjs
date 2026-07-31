import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const SECURITY_PACKAGE = "packages/runtime/security";
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
const LEGACY = [
	"securityHeadersForNext",
	"strictSecurityHeadersForNext",
	"NextSecurityHeader",
	"DEFAULT_SECURITY_HEADERS",
	"buildContentSecurityPolicy",
	"applySecurityHeaders",
	"buildCorsHeaders",
	"createCorsConfig",
	"handleCorsPreflight",
];
const SECOND_RUNTIME_EXPORT_PATTERN =
	/export\s+(?:const|function|class)\s+(?!security\b)/;
const NEXT_LEAK_PATTERN =
	/from\s+["']next(?:\/|["'])|\bNext(?:Config|Response|Request|SecurityHeader)\b/;
const DEEP_SECURITY_IMPORT_PATTERN = /from\s+["']@afenda\/security\//;

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

export function checkSecurityBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, SECURITY_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (exports.length !== 1 || exports[0] !== ".") {
		violations.push(
			`${SECURITY_PACKAGE}/package.json: only the root export is authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (dependency.startsWith("@afenda/")) {
			violations.push(
				`${SECURITY_PACKAGE}/package.json: leaf has runtime workspace dependency ${dependency}`,
			);
		}
	}
	const index = readFileSync(
		join(root, SECURITY_PACKAGE, "src/index.ts"),
		"utf8",
	);
	if (!index.includes("export const security = Object.freeze")) {
		violations.push(
			`${SECURITY_PACKAGE}/src/index.ts: missing permanent security capability`,
		);
	}
	if (SECOND_RUNTIME_EXPORT_PATTERN.test(index)) {
		violations.push(
			`${SECURITY_PACKAGE}/src/index.ts: root exposes a second runtime capability`,
		);
	}

	walk(join(root, SECURITY_PACKAGE, "src"), (file) => {
		if (!SOURCE_EXTENSIONS.has(extname(file))) {
			return;
		}
		const source = readFileSync(file, "utf8");
		if (NEXT_LEAK_PATTERN.test(source)) {
			violations.push(
				`${posix(relative(root, file))}: Next.js leaked into security package`,
			);
		}
	});
	for (const sourceRoot of ["apps", "packages"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			const source = readFileSync(file, "utf8");
			if (DEEP_SECURITY_IMPORT_PATTERN.test(source)) {
				violations.push(`${rel}: deep @afenda/security import`);
			}
			if (!rel.startsWith(`${SECURITY_PACKAGE}/`)) {
				for (const legacy of LEGACY) {
					if (source.includes(legacy)) {
						violations.push(`${rel}: deleted security surface ${legacy}`);
					}
				}
			}
		});
	}
	const nextConfig = readFileSync(
		join(root, "apps/web/next.config.ts"),
		"utf8",
	);
	if (
		!(
			nextConfig.includes("security.headers") &&
			nextConfig.includes("key: name")
		)
	) {
		violations.push(
			"apps/web/next.config.ts: missing application-owned Next.js security adapter",
		);
	}
	return violations.toSorted();
}

function main() {
	const violations = checkSecurityBoundary(REPOSITORY_ROOT);
	if (violations.length) {
		console.error("check-security-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-security-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
