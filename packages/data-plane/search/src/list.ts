import { fail, type Result } from "@afenda/errors/result";

import { resolveSearchStore } from "./resolve-store";
import { searchListIdsInputSchema } from "./schemas";
import type { SearchStore } from "./store";

/**
 * Lists documentIds for an org + entity (sync prune / inventory).
 * `organizationId` is always required.
 */
export async function listSearchDocumentIds(
	input: unknown,
	store?: SearchStore,
): Promise<Result<string[]>> {
	const parsed = searchListIdsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid search list-ids input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveSearchStore(store).listDocumentIds(parsed.data);
}
