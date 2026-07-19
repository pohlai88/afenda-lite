import { getDefaultMetricsRegistry } from "./registry";
import type {
	RecordCacheAccessInput,
	RecordDbQueryInput,
	RecordHttpRequestInput,
} from "./types";

function resolveBundle(input: {
	readonly registry?: RecordHttpRequestInput["registry"];
}) {
	return input.registry ?? getDefaultMetricsRegistry();
}

function normalizeMethod(method: string): string {
	const trimmed = method.trim();
	if (trimmed.length === 0) {
		throw new Error("@afenda/metrics: method must be a non-empty HTTP method");
	}
	return trimmed.toUpperCase();
}

/**
 * Accept only low-cardinality path templates — never raw URLs or query strings.
 */
export function assertRouteTemplate(routeTemplate: string): string {
	const trimmed = routeTemplate.trim();
	if (trimmed.length === 0) {
		throw new Error(
			"@afenda/metrics: routeTemplate must be a non-empty path template",
		);
	}
	if (trimmed.includes("?") || trimmed.includes("://")) {
		throw new Error(
			"@afenda/metrics: routeTemplate must not include query strings or absolute URLs",
		);
	}
	return trimmed;
}

/**
 * Record one HTTP request (duration + count).
 * `routeTemplate` must be a static path template — never raw URLs.
 */
export function recordHttpRequest(input: RecordHttpRequestInput): void {
	const bundle = resolveBundle(input);
	const method = normalizeMethod(input.method);
	const route = assertRouteTemplate(input.routeTemplate);
	const statusCode = String(input.statusCode);
	const labels = {
		method,
		route,
		status_code: statusCode,
		service: bundle.service,
	};

	bundle.httpRequestDuration.observe(labels, input.durationSeconds);
	bundle.httpRequestTotal.inc(labels);
}

/** Record one database query duration. */
export function recordDbQuery(input: RecordDbQueryInput): void {
	const bundle = resolveBundle(input);
	bundle.dbQueryDuration.observe(
		{
			operation: input.operation,
			table: input.table,
			service: bundle.service,
		},
		input.durationSeconds,
	);
}

/** Record one cache hit or miss. */
export function recordCacheAccess(input: RecordCacheAccessInput): void {
	const bundle = resolveBundle(input);
	bundle.cacheAccessTotal.inc({
		operation: input.operation,
		result: input.result,
		service: bundle.service,
	});
}
