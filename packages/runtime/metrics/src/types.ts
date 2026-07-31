import type { METRIC_SEMANTIC_REGISTRY } from "./semantic-registry";

export type HttpMetricMethod =
	(typeof METRIC_SEMANTIC_REGISTRY.labelValues.httpMethods)[number];
export type DbMetricOperation =
	(typeof METRIC_SEMANTIC_REGISTRY.labelValues.dbOperations)[number];
export type CacheMetricOperation =
	(typeof METRIC_SEMANTIC_REGISTRY.labelValues.cacheOperations)[number];
export type CacheMetricResult =
	(typeof METRIC_SEMANTIC_REGISTRY.labelValues.cacheResults)[number];

export interface HttpMetricInput {
	readonly durationSeconds: number;
	readonly method: string;
	/** Static route template only; raw URLs, queries, UUIDs, and numeric path IDs are rejected. */
	readonly routeTemplate: string;
	readonly statusCode: number;
}

export interface DbMetricInput {
	readonly durationSeconds: number;
	readonly operation: DbMetricOperation;
	readonly table: string;
}

export interface CacheMetricInput {
	readonly operation: CacheMetricOperation;
	readonly result: CacheMetricResult;
}

export interface MetricsCapability {
	readonly exposition: {
		readonly contentType: string;
		readonly render: () => Promise<string>;
	};
	readonly record: {
		readonly cache: (input: CacheMetricInput) => void;
		readonly db: (input: DbMetricInput) => void;
		readonly http: (input: HttpMetricInput) => void;
	};
}
