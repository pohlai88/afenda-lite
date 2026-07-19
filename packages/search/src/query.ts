import { fail, type Result } from "@afenda/errors/result";

import { resolveSearchStore } from "./resolve-store";
import { searchQueryOptionsSchema } from "./schemas";
import type { SearchStore } from "./store";
import type { SearchHit } from "./types";

/**
 * Org-scoped full-text search. `organizationId` is always required.
 */
export async function searchDocuments(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchHit[]>> {
	const parsed = searchQueryOptionsSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid search query input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveSearchStore(store).search(parsed.data);
}
