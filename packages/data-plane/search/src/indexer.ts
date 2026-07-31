import { errorResult, type Result } from "@afenda/errors";
import { normalizeSearchUpsert } from "./normalization";
import { resolveSearchStore } from "./resolve-store";
import {
	searchDeleteInputSchema,
	searchUpsertBatchSchema,
	searchUpsertInputSchema,
} from "./schemas";
import type { SearchStore } from "./store";
import type { SearchDocument } from "./types";

export function upsertSearchDocument(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchDocument>> {
	const parsed = searchUpsertInputSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid search upsert input",
			}),
		);
	}
	return resolveSearchStore(store).upsert(normalizeSearchUpsert(parsed.data));
}

export function upsertSearchDocuments(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchDocument[]>> {
	const parsed = searchUpsertBatchSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid search upsert batch input",
			}),
		);
	}
	return resolveSearchStore(store).upsertBatch(
		parsed.data.map(normalizeSearchUpsert),
	);
}

export function deleteSearchDocument(
	input: unknown,
	store?: SearchStore,
): Promise<Result<{ deleted: boolean }>> {
	const parsed = searchDeleteInputSchema.safeParse(input);
	if (!parsed.success) {
		return Promise.resolve(
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Invalid search delete input",
			}),
		);
	}
	return resolveSearchStore(store).delete(parsed.data);
}
