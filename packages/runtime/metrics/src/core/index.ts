/**
 * @afenda/metrics/core - Universal metric contracts
 * No runtime dependencies - works in Node, Edge, Browser
 */

// Constants
export {
	DB_DURATION_BUCKETS,
	DEFAULT_METRICS_SERVICE,
	HTTP_DURATION_BUCKETS,
} from "./constants";

// Route validation
export { assertRouteTemplate } from "./route-template";

// Universal types
export type {
	CacheAccessResult,
	RecordCacheAccessInput,
	RecordDbQueryInput,
	RecordHttpRequestInput,
} from "./types";
