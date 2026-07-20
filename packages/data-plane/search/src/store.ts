import type { Result } from "@afenda/errors/result";

import type {
	SearchDeleteInput,
	SearchDocument,
	SearchHit,
	SearchListIdsInput,
	SearchQueryOptions,
	SearchUpsertInput,
} from "./types";

/**
 * Persistence port for org-scoped product search.
 * Production adapter: DrizzleSearchStore.
 */
export type SearchStore = {
	upsert(input: SearchUpsertInput): Promise<Result<SearchDocument>>;
	upsertBatch(inputs: SearchUpsertInput[]): Promise<Result<SearchDocument[]>>;
	delete(input: SearchDeleteInput): Promise<Result<{ deleted: boolean }>>;
	listDocumentIds(input: SearchListIdsInput): Promise<Result<string[]>>;
	search(options: SearchQueryOptions): Promise<Result<SearchHit[]>>;
};
