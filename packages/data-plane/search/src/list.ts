import { errorResult, type Result } from "@afenda/errors";

import { resolveSearchStore } from "./resolve-store";
import { searchListIdsInputSchema } from "./schemas";
import type { SearchStore } from "./store";

/**
 * Lists documentIds for an org + entity (sync prune / inventory).
 * `organizationId` is always required.
 */
export function listSearchDocumentIds(
	input: unknown,
	store?: SearchStore,
): Promise<Result<string[]>> {
	const parsed = searchListIdsInputSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid search list-ids input",
			}),
		);
	}
	return resolveSearchStore(store).listDocumentIds(parsed.data);
}
