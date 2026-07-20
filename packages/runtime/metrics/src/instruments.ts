import { Counter, Histogram, type Registry } from "prom-client";

/** HTTP latency buckets (seconds) — borrowed from Vierp DNA, tunable. */
export const HTTP_DURATION_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 2, 5] as const;

/** DB latency buckets (seconds) — borrowed from Vierp DNA, tunable. */
export const DB_DURATION_BUCKETS = [
	0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1,
] as const;

export function createHttpInstruments(registry: Registry) {
	const httpRequestDuration = new Histogram({
		name: "http_request_duration_seconds",
		help: "Duration of HTTP requests in seconds",
		labelNames: ["method", "route", "status_code", "service"] as const,
		buckets: [...HTTP_DURATION_BUCKETS],
		registers: [registry],
	});

	const httpRequestTotal = new Counter({
		name: "http_request_total",
		help: "Total number of HTTP requests",
		labelNames: ["method", "route", "status_code", "service"] as const,
		registers: [registry],
	});

	return { httpRequestDuration, httpRequestTotal };
}

export function createDbInstruments(registry: Registry) {
	const dbQueryDuration = new Histogram({
		name: "db_query_duration_seconds",
		help: "Duration of database queries in seconds",
		labelNames: ["operation", "table", "service"] as const,
		buckets: [...DB_DURATION_BUCKETS],
		registers: [registry],
	});

	return { dbQueryDuration };
}

export function createCacheInstruments(registry: Registry) {
	const cacheAccessTotal = new Counter({
		name: "cache_access_total",
		help: "Total number of cache access operations",
		labelNames: ["operation", "result", "service"] as const,
		registers: [registry],
	});

	return { cacheAccessTotal };
}
