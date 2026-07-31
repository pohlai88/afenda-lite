import { errorResult, type Result } from "@afenda/errors";
import { normalizeSearchQuery } from "./normalization";
import { resolveSearchStore } from "./resolve-store";
import { searchQueryOptionsSchema } from "./schemas";
import type { SearchStore } from "./store";
import type { SearchHit } from "./types";

/**
 * Org-scoped full-text search. `organizationId` is always required.
 */
export function searchDocuments(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchHit[]>> {
	const parsed = searchQueryOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid search query input",
			}),
		);
	}
	return resolveSearchStore(store).search(normalizeSearchQuery(parsed.data));
}
