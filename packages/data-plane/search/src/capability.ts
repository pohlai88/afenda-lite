import type { Result } from "@afenda/errors";

import {
	deleteSearchDocument,
	upsertSearchDocument,
	upsertSearchDocuments,
} from "./indexer";
import { listSearchDocumentIds } from "./list";
import { searchDocuments } from "./query";
import {
	SEARCH_DOCUMENT_POLICY,
	SEARCH_ENTITIES,
	SEARCH_ENTITY_REGISTRY,
	SEARCH_ENTITY_VALUES,
	SEARCH_LIFECYCLE_POLICY,
	SEARCH_MASTER_DATA_ENTITY_VALUES,
	SEARCH_RANKING_POLICY,
} from "./semantic-registry";
import type { SearchStore } from "./store";
import type { SearchDocument, SearchHit } from "./types";

export interface SearchCapability {
	documents: Readonly<{
		delete: (input: unknown) => Promise<Result<{ deleted: boolean }>>;
		listIds: (input: unknown) => Promise<Result<string[]>>;
		upsert: (input: unknown) => Promise<Result<SearchDocument>>;
		upsertMany: (input: unknown) => Promise<Result<SearchDocument[]>>;
	}>;
	entities: typeof SEARCH_ENTITIES;
	entityValues: typeof SEARCH_ENTITY_VALUES;
	masterDataEntityValues: typeof SEARCH_MASTER_DATA_ENTITY_VALUES;
	policy: Readonly<{
		document: typeof SEARCH_DOCUMENT_POLICY;
		lifecycle: typeof SEARCH_LIFECYCLE_POLICY;
		ranking: typeof SEARCH_RANKING_POLICY;
	}>;
	query: (input: unknown) => Promise<Result<SearchHit[]>>;
	registry: typeof SEARCH_ENTITY_REGISTRY;
}

export function createSearchCapability(store?: SearchStore): SearchCapability {
	return Object.freeze({
		documents: Object.freeze({
			delete: (input: unknown) => deleteSearchDocument(input, store),
			listIds: (input: unknown) => listSearchDocumentIds(input, store),
			upsert: (input: unknown) => upsertSearchDocument(input, store),
			upsertMany: (input: unknown) => upsertSearchDocuments(input, store),
		}),
		entities: SEARCH_ENTITIES,
		entityValues: SEARCH_ENTITY_VALUES,
		masterDataEntityValues: SEARCH_MASTER_DATA_ENTITY_VALUES,
		policy: Object.freeze({
			document: SEARCH_DOCUMENT_POLICY,
			lifecycle: SEARCH_LIFECYCLE_POLICY,
			ranking: SEARCH_RANKING_POLICY,
		}),
		query: (input: unknown) => searchDocuments(input, store),
		registry: SEARCH_ENTITY_REGISTRY,
	});
}

export const search = createSearchCapability();
