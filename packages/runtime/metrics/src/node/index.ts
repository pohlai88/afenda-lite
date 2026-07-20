/**
 * @afenda/metrics/node - Node Prometheus implementation
 * Requires prom-client - Node runtime only
 */

export type {
	CacheAccessResult,
	RecordCacheAccessInput,
	RecordDbQueryInput,
	RecordHttpRequestInput,
} from "../core";
// Re-export universal core
export {
	assertRouteTemplate,
	DB_DURATION_BUCKETS,
	DEFAULT_METRICS_SERVICE,
	HTTP_DURATION_BUCKETS,
} from "../core";
export { recordCacheAccess, recordDbQuery, recordHttpRequest } from "./record";
// Node Prometheus implementation
export { createMetricsRegistry, getDefaultMetricsRegistry } from "./registry";

export { PROMETHEUS_CONTENT_TYPE, renderPrometheusText } from "./render";

// Node-specific types
export type {
	CreateMetricsRegistryOptions,
	MetricsRegistryBundle,
} from "./types";
