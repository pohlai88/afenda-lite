import { METRIC_SEMANTIC_REGISTRY } from "./semantic-registry";
import type { CacheMetricInput, DbMetricInput, HttpMetricInput } from "./types";

const UUID_PATTERN =
	/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const NUMERIC_PATH_SEGMENT_PATTERN = /\/(?:\d+)(?:\/|$)/;
const TABLE_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;
const PROHIBITED_KEYS = new Set([
	"labels",
	"metricname",
	"name",
	"organization",
	"organizationid",
	"orgid",
	"tenant",
	"tenantid",
]);
const HTTP_METHODS = new Set<string>(
	METRIC_SEMANTIC_REGISTRY.labelValues.httpMethods,
);
const DB_OPERATIONS = new Set<string>(
	METRIC_SEMANTIC_REGISTRY.labelValues.dbOperations,
);
const CACHE_OPERATIONS = new Set<string>(
	METRIC_SEMANTIC_REGISTRY.labelValues.cacheOperations,
);
const CACHE_RESULTS = new Set<string>(
	METRIC_SEMANTIC_REGISTRY.labelValues.cacheResults,
);

function assertClosedInput(input: object): void {
	for (const key of Object.keys(input)) {
		const normalized = key.toLowerCase().replaceAll("_", "");
		if (PROHIBITED_KEYS.has(normalized)) {
			throw new RangeError(
				`@afenda/metrics prohibited metric input key: ${key}`,
			);
		}
	}
}

function assertDuration(durationSeconds: number): void {
	if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
		throw new RangeError(
			"@afenda/metrics duration must be finite and non-negative",
		);
	}
}

export function normalizeHttpInput(input: HttpMetricInput): HttpMetricInput {
	assertClosedInput(input);
	assertDuration(input.durationSeconds);
	const method = input.method.trim().toUpperCase();
	if (!HTTP_METHODS.has(method)) {
		throw new RangeError(
			"@afenda/metrics method is outside the canonical label values",
		);
	}
	const routeTemplate = input.routeTemplate.trim();
	if (
		!routeTemplate.startsWith("/") ||
		routeTemplate.includes("?") ||
		routeTemplate.includes("://") ||
		UUID_PATTERN.test(routeTemplate) ||
		NUMERIC_PATH_SEGMENT_PATTERN.test(routeTemplate)
	) {
		throw new RangeError(
			"@afenda/metrics route must be a static low-cardinality path template",
		);
	}
	if (
		!Number.isInteger(input.statusCode) ||
		input.statusCode < 100 ||
		input.statusCode > 599
	) {
		throw new RangeError("@afenda/metrics status code must be an HTTP status");
	}
	return { ...input, method, routeTemplate };
}

export function normalizeDbInput(input: DbMetricInput): DbMetricInput {
	assertClosedInput(input);
	assertDuration(input.durationSeconds);
	if (!DB_OPERATIONS.has(input.operation)) {
		throw new RangeError(
			"@afenda/metrics DB operation is outside the canonical label values",
		);
	}
	if (!TABLE_PATTERN.test(input.table)) {
		throw new RangeError(
			"@afenda/metrics table label must be a canonical SQL identifier",
		);
	}
	return input;
}

export function normalizeCacheInput(input: CacheMetricInput): CacheMetricInput {
	assertClosedInput(input);
	if (
		!(CACHE_OPERATIONS.has(input.operation) && CACHE_RESULTS.has(input.result))
	) {
		throw new RangeError(
			"@afenda/metrics cache labels are outside canonical values",
		);
	}
	return input;
}
