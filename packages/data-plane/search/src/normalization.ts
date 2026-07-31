import { sanitizeSearchMetadata } from "./sanitize";
import type { SearchQueryOptions, SearchUpsertInput } from "./types";

const WHITESPACE = /\s+/g;

export function normalizeSearchText(value: string): string {
	return value.normalize("NFKC").replace(WHITESPACE, " ").trim();
}

export function normalizeSearchUpsert(
	input: SearchUpsertInput,
): SearchUpsertInput {
	return Object.freeze({
		...input,
		description:
			input.description === undefined || input.description === null
				? null
				: normalizeSearchText(input.description) || null,
		documentId: normalizeSearchText(input.documentId),
		metadata: sanitizeSearchMetadata(input.metadata),
		title: normalizeSearchText(input.title),
		url:
			input.url === undefined || input.url === null
				? null
				: normalizeSearchText(input.url) || null,
	});
}

export function normalizeSearchQuery(
	input: SearchQueryOptions,
): SearchQueryOptions {
	return Object.freeze({ ...input, query: normalizeSearchText(input.query) });
}
