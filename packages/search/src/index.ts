import "server-only";

export {
	createDrizzleSearchStore,
	DrizzleSearchStore,
} from "./drizzle-store";
export {
	deleteSearchDocument,
	upsertSearchDocument,
	upsertSearchDocuments,
} from "./indexer";
export { listSearchDocumentIds } from "./list";
export { searchDocuments } from "./query";
export { sanitizeSearchMetadata } from "./sanitize";
export {
	DEFAULT_SEARCH_LIMIT,
	MAX_SEARCH_BATCH_SIZE,
	MAX_SEARCH_DESCRIPTION_LENGTH,
	MAX_SEARCH_DOCUMENT_ID_LENGTH,
	MAX_SEARCH_ENTITY_LENGTH,
	MAX_SEARCH_LIMIT,
	MAX_SEARCH_QUERY_LENGTH,
	MAX_SEARCH_TITLE_LENGTH,
	MAX_SEARCH_URL_LENGTH,
	type ParsedSearchDocument,
	searchDeleteInputSchema,
	searchDocumentSchema,
	searchHitSchema,
	searchListIdsInputSchema,
	searchQueryOptionsSchema,
	searchUpsertBatchSchema,
	searchUpsertInputSchema,
} from "./schemas";
export type { SearchStore } from "./store";
export type {
	SearchDeleteInput,
	SearchDocument,
	SearchHit,
	SearchListIdsInput,
	SearchQueryOptions,
	SearchUpsertInput,
} from "./types";
