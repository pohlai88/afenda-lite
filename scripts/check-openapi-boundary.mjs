import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const OPENAPI_PACKAGE = "packages/runtime/openapi";
const AUTHORIZED_EXPORTS = new Set([".", "./node"]);
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
const PROHIBITED_SUBPATH = /from\s+["']@afenda\/openapi\/(?!node["'])/;
const VENDOR_BYPASS = /from\s+["']@asteasolutions\/zod-to-openapi["']/;
const LEGACY_SURFACES = [
	"OpenAPIRegistry",
	"OpenApiGeneratorV3",
	"dataEnvelope",
	"stampAfendaDocument",
	"stampOperationMetadata",
	"writeOpenApiYaml",
];
const DUPLICATED_ERROR_SCHEMA =
	/apiErrorBodySchema|apiErrorCodeSchema|WEB_API_ERROR_CODES/;

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

function checkSource(rel, source, violations) {
	if (PROHIBITED_SUBPATH.test(source)) {
		violations.push(`${rel}: prohibited @afenda/openapi subpath`);
	}
	if (!rel.startsWith(`${OPENAPI_PACKAGE}/`)) {
		if (VENDOR_BYPASS.test(source)) {
			violations.push(`${rel}: direct zod-to-openapi vendor bypass`);
		}
		for (const legacy of LEGACY_SURFACES) {
			if (source.includes(legacy)) {
				violations.push(`${rel}: deleted OpenAPI surface ${legacy}`);
			}
		}
		if (DUPLICATED_ERROR_SCHEMA.test(source)) {
			violations.push(
				`${rel}: duplicated canonical error schema or code registry`,
			);
		}
	}
	if (
		rel === "scripts/generate-openapi.mts" &&
		!source.includes("errorOpenApi")
	) {
		violations.push(
			`${rel}: error responses must derive from @afenda/errors errorOpenApi`,
		);
	}
}

export function checkOpenApiBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, OPENAPI_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${OPENAPI_PACKAGE}/package.json: only root and node exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (dependency.startsWith("@afenda/")) {
			violations.push(
				`${OPENAPI_PACKAGE}/package.json: leaf has runtime workspace dependency ${dependency}`,
			);
		}
	}

	for (const sourceRoot of ["apps", "packages", "scripts"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			if (rel.startsWith("scripts/check-openapi-boundary")) {
				return;
			}
			const source = readFileSync(file, "utf8");
			checkSource(rel, source, violations);
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkOpenApiBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-openapi-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-openapi-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
