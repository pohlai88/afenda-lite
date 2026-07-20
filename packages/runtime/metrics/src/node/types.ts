/**
 * Node-specific Prometheus types - depends on prom-client.
 */
import type { Counter, Histogram, Registry } from "prom-client";

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
