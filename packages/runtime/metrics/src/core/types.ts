/**
 * Universal metric input contracts - no runtime dependencies.
 * These types work in any JavaScript runtime (Node, Edge, Browser).
 */

export type CacheAccessResult = "hit" | "miss";

export type RecordHttpRequestInput = {
	readonly method: string;
	/** Static route template — never raw URLs or query strings. */
	readonly routeTemplate: string;
	readonly statusCode: number;
	readonly durationSeconds: number;
};

export type RecordDbQueryInput = {
	readonly operation: string;
	readonly table: string;
	readonly durationSeconds: number;
};

export type RecordCacheAccessInput = {
	readonly operation: string;
	readonly result: CacheAccessResult;
};
