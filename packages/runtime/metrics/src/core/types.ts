/**
 * Universal metric input contracts - no runtime dependencies.
 * These types work in any JavaScript runtime (Node, Edge, Browser).
 */

export type CacheAccessResult = "hit" | "miss";

export interface RecordHttpRequestInput {
	readonly durationSeconds: number;
	readonly method: string;
	/** Static route template — never raw URLs or query strings. */
	readonly routeTemplate: string;
	readonly statusCode: number;
}

export interface RecordDbQueryInput {
	readonly durationSeconds: number;
	readonly operation: string;
	readonly table: string;
}

export interface RecordCacheAccessInput {
	readonly operation: string;
	readonly result: CacheAccessResult;
}
