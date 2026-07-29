/**
 * Node-specific Prometheus types - depends on prom-client.
 */
import type { Counter, Histogram, Registry } from "prom-client";

export interface CreateMetricsRegistryOptions {
	/** When true (default), collect Node process defaults onto the registry. */
	readonly collectDefaults?: boolean;
	/** Low-cardinality service label shared by all instruments. */
	readonly service?: string;
}

export interface MetricsRegistryBundle {
	readonly cacheAccessTotal: Counter<"operation" | "result" | "service">;
	readonly dbQueryDuration: Histogram<"operation" | "table" | "service">;
	readonly httpRequestDuration: Histogram<
		"method" | "route" | "status_code" | "service"
	>;
	readonly httpRequestTotal: Counter<
		"method" | "route" | "status_code" | "service"
	>;
	readonly registry: Registry;
	readonly service: string;
}
