import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const LOGGER_PACKAGE = "packages/runtime/logger";
const PERMANENT_EXPORTS = new Set([".", "./edge"]);
const SOURCE_ROOTS = ["apps", "packages"];
const SOURCE_EXTENSIONS = new Set([
	".cts",
	".js",
	".mjs",
	".mts",
	".ts",
	".tsx",
]);
const SKIPPED_DIRECTORIES = new Set([
	".git",
	".next",
	".turbo",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"storybook-static",
]);
const DELETED_SURFACES = [
	"createLogger",
	"createEdgeLogger",
	"logProductEvent",
	"DEFAULT_REDACT_PATHS",
];
const DIRECT_PINO_PATTERN = /from\s+["']pino["']|require\(["']pino["']\)/;
const EDGE_NODE_PATTERN =
	/from\s+["'](?:pino|node:)|require\(["'](?:pino|node:)/;

function toPosix(value) {
	return value.replaceAll("\\", "/");
}

function walk(directory, visit) {
	if (!existsSync(directory)) {
		return;
	}
	for (const name of readdirSync(directory)) {
		if (SKIPPED_DIRECTORIES.has(name)) {
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

function readJson(file, violations) {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		violations.push(`${toPosix(file)}: invalid JSON (${String(error)})`);
	}
}

function checkPackage(root, violations) {
	const manifestPath = join(root, LOGGER_PACKAGE, "package.json");
	const manifest = readJson(manifestPath, violations);
	const exports = Object.keys(manifest?.exports ?? {});
	for (const exportPath of exports) {
		if (!PERMANENT_EXPORTS.has(exportPath)) {
			violations.push(
				`${LOGGER_PACKAGE}/package.json: prohibited export ${exportPath}`,
			);
		}
	}
	for (const exportPath of PERMANENT_EXPORTS) {
		if (!exports.includes(exportPath)) {
			violations.push(
				`${LOGGER_PACKAGE}/package.json: missing export ${exportPath}`,
			);
		}
	}
	for (const dependency of Object.keys(manifest?.dependencies ?? {})) {
		if (dependency.startsWith("@afenda/")) {
			violations.push(
				`${LOGGER_PACKAGE}/package.json: runtime workspace dependency ${dependency}`,
			);
		}
	}
}

function checkSource(file, root, violations) {
	const relativeFile = toPosix(relative(root, file));
	const source = readFileSync(file, "utf8");
	if (
		!relativeFile.startsWith(`${LOGGER_PACKAGE}/`) &&
		DIRECT_PINO_PATTERN.test(source)
	) {
		violations.push(
			`${relativeFile}: direct pino dependency bypasses @afenda/logger`,
		);
	}
	for (const deleted of DELETED_SURFACES) {
		if (source.includes(deleted)) {
			violations.push(`${relativeFile}: deleted logger surface ${deleted}`);
		}
	}
	if (source.includes("modules/platform/observability/product-log")) {
		violations.push(`${relativeFile}: deleted app-local logger facade`);
	}
}

function checkEdgeIsolation(root, violations) {
	for (const file of [
		"edge.ts",
		"policy.ts",
		"semantic-registry.ts",
		"types.ts",
	]) {
		const source = readFileSync(
			join(root, LOGGER_PACKAGE, "src", file),
			"utf8",
		);
		if (EDGE_NODE_PATTERN.test(source)) {
			violations.push(
				`${LOGGER_PACKAGE}/src/${file}: edge graph loads Node/Pino code`,
			);
		}
	}
}

export function checkLoggerBoundary(root) {
	const violations = [];
	checkPackage(root, violations);
	checkEdgeIsolation(root, violations);
	for (const sourceRoot of SOURCE_ROOTS) {
		walk(join(root, sourceRoot), (file) => {
			if (SOURCE_EXTENSIONS.has(extname(file))) {
				checkSource(file, root, violations);
			}
		});
	}
	const deletedFacade = join(
		root,
		"apps/web/modules/platform/observability/product-log.ts",
	);
	if (existsSync(deletedFacade)) {
		violations.push(
			"apps/web/modules/platform/observability/product-log.ts: deleted facade still exists",
		);
	}
	return violations.toSorted();
}

function main() {
	const violations = checkLoggerBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-logger-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-logger-boundary: ok");
}

const entryFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
	main();
}
