import type { Counter, Histogram, Registry } from "prom-client";

/** Default Prometheus `service` label for Afenda-Lite Node surfaces. */
export const DEFAULT_METRICS_SERVICE = "afenda-web" as const;

export type CacheAccessResult = "hit" | "miss";

export type CreateMetricsRegistryOptions = {
	/** When true (default), collect Node process defaults onto the registry. */
	readonly collectDefaults?: boolean;
	/** Low-cardinality service label shared by all instruments. */
	readonly service?: string;
};

export type MetricsRegistryBundle = {
	readonly registry: Registry;
	readonly service: string;
	readonly httpRequestDuration: Histogram<
		"method" | "route" | "status_code" | "service"
	>;
	readonly httpRequestTotal: Counter<
		"method" | "route" | "status_code" | "service"
	>;
	readonly dbQueryDuration: Histogram<"operation" | "table" | "service">;
	readonly cacheAccessTotal: Counter<"operation" | "result" | "service">;
};

export type RecordHttpRequestInput = {
	readonly method: string;
	/** Static route template — never raw URLs or query strings. */
	readonly routeTemplate: string;
	readonly statusCode: number;
	readonly durationSeconds: number;
	readonly registry?: MetricsRegistryBundle;
};

export type RecordDbQueryInput = {
	readonly operation: string;
	readonly table: string;
	readonly durationSeconds: number;
	readonly registry?: MetricsRegistryBundle;
};

export type RecordCacheAccessInput = {
	readonly operation: string;
	readonly result: CacheAccessResult;
	readonly registry?: MetricsRegistryBundle;
};
