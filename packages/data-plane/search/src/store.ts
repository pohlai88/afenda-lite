import type { Result } from "@afenda/errors";

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
export interface SearchStore {
	delete: (input: SearchDeleteInput) => Promise<Result<{ deleted: boolean }>>;
	listDocumentIds: (input: SearchListIdsInput) => Promise<Result<string[]>>;
	search: (options: SearchQueryOptions) => Promise<Result<SearchHit[]>>;
	upsert: (input: SearchUpsertInput) => Promise<Result<SearchDocument>>;
	upsertBatch: (
		inputs: SearchUpsertInput[],
	) => Promise<Result<SearchDocument[]>>;
}
