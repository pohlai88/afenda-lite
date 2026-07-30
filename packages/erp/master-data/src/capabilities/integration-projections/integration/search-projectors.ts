import type { Result } from "@afenda/errors/result";

import type { MasterDataEventEnvelope } from "./event-envelope";
import type {
	MasterSearchDocument,
	RemoveMasterSearchDocumentInput,
} from "./search-document";

export const SEARCH_PROJECTION_IGNORE_REASONS = [
	"event_not_search_relevant",
	"entity_type_not_indexed",
	"lifecycle_excluded",
	"projection_unchanged",
] as const;

export type SearchProjectionIgnoreReason =
	(typeof SEARCH_PROJECTION_IGNORE_REASONS)[number];

export type SearchProjectionDecision =
	| Readonly<{
			kind: "upsert";
			document: MasterSearchDocument;
	  }>
	| Readonly<{
			kind: "remove";
			input: RemoveMasterSearchDocumentInput;
	  }>
	| Readonly<{
			kind: "ignore";
			reason: SearchProjectionIgnoreReason;
	  }>;

export const SEARCH_PROJECTION_UPSERT_OUTCOMES = [
	"applied",
	"replayed",
	"ignored_stale",
] as const;

export type SearchProjectionUpsertOutcome =
	(typeof SEARCH_PROJECTION_UPSERT_OUTCOMES)[number];

export const SEARCH_PROJECTION_REMOVE_OUTCOMES = [
	"removed",
	"not_found",
	"retained_newer_version",
] as const;

export type SearchProjectionRemoveOutcome =
	(typeof SEARCH_PROJECTION_REMOVE_OUTCOMES)[number];

export interface SearchProjectionPort {
	remove: (
		input: RemoveMasterSearchDocumentInput,
	) => Promise<Result<SearchProjectionRemoveOutcome>>;
	upsert: (
		document: MasterSearchDocument,
	) => Promise<Result<SearchProjectionUpsertOutcome>>;
}

export interface MasterSearchProjector {
	project: (
		event: MasterDataEventEnvelope,
	) => Promise<Result<SearchProjectionDecision>>;
}
