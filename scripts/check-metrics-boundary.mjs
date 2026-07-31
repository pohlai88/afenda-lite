import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const METRICS_PACKAGE = "packages/runtime/metrics";
const AUTHORIZED_EXPORTS = new Set([".", "./testing"]);
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
const DEEP_IMPORT_PATTERN = /from\s+["']@afenda\/metrics\/(?!testing["'])/;
const DIRECT_PROM_CLIENT_PATTERN =
	/from\s+["']prom-client["']|require\(["']prom-client["']\)/;
const PROHIBITED_RECORD_LABEL_PATTERN =
	/metrics\.record\.\w+\s*\(\s*\{[\s\S]{0,800}?\b(?:organization_?id|org_?id|tenant_?id|labels|metric_?name)\s*:/i;
const KNOWN_METRIC_NAME_PATTERN =
	/["'](?:http_request_duration_seconds|http_request_total|db_query_duration_seconds|cache_access_total|afenda_purchasing_command_total|afenda_receiving_command_total)["']/;
const LEGACY = [
	"createMetricsRegistry",
	"getDefaultMetricsRegistry",
	"MetricsRegistryBundle",
	"recordHttpRequest",
	"recordDbQuery",
	"recordCacheAccess",
	"renderPrometheusText",
	"PROMETHEUS_CONTENT_TYPE",
	"resetDefaultMetricsRegistryForTests",
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

function checkConsumerSource(rel, source, violations) {
	if (DIRECT_PROM_CLIENT_PATTERN.test(source)) {
		violations.push(`${rel}: direct prom-client bypass`);
	}
	if (PROHIBITED_RECORD_LABEL_PATTERN.test(source)) {
		violations.push(
			`${rel}: prohibited organization, tenant, name, or open metric labels`,
		);
	}
	if (
		KNOWN_METRIC_NAME_PATTERN.test(source) &&
		!rel.includes("__tests__/api-metrics-route.test.ts")
	) {
		violations.push(`${rel}: consumer constructs a canonical metric name`);
	}
	for (const legacy of LEGACY) {
		if (source.includes(legacy)) {
			violations.push(`${rel}: deleted metrics surface ${legacy}`);
		}
	}
	if (rel.endsWith("/metrics.ts")) {
		violations.push(`${rel}: consumer-owned metric registry file`);
	}
}

export function checkMetricsBoundary(root) {
	const violations = [];
	const manifest = JSON.parse(
		readFileSync(join(root, METRICS_PACKAGE, "package.json"), "utf8"),
	);
	const exports = Object.keys(manifest.exports ?? {});
	if (
		exports.length !== AUTHORIZED_EXPORTS.size ||
		exports.some((value) => !AUTHORIZED_EXPORTS.has(value))
	) {
		violations.push(
			`${METRICS_PACKAGE}/package.json: only root and testing exports are authorized`,
		);
	}
	for (const dependency of Object.keys(manifest.dependencies ?? {})) {
		if (dependency.startsWith("@afenda/")) {
			violations.push(
				`${METRICS_PACKAGE}/package.json: leaf has runtime workspace dependency ${dependency}`,
			);
		}
	}
	for (const sourceRoot of ["apps", "packages"]) {
		walk(join(root, sourceRoot), (file) => {
			if (!SOURCE_EXTENSIONS.has(extname(file))) {
				return;
			}
			const rel = posix(relative(root, file));
			const source = readFileSync(file, "utf8");
			if (DEEP_IMPORT_PATTERN.test(source)) {
				violations.push(`${rel}: prohibited @afenda/metrics subpath`);
			}
			if (!rel.startsWith(`${METRICS_PACKAGE}/`)) {
				checkConsumerSource(rel, source, violations);
			}
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkMetricsBoundary(REPOSITORY_ROOT);
	if (violations.length) {
		console.error("check-metrics-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-metrics-boundary: ok");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entry && import.meta.url === pathToFileURL(entry).href) {
	main();
}
