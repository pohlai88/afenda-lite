import { fail, type Result } from "@afenda/errors/result";

import { resolveSearchStore } from "./resolve-store";
import {
	searchDeleteInputSchema,
	searchUpsertBatchSchema,
	searchUpsertInputSchema,
} from "./schemas";
import type { SearchStore } from "./store";
import type { SearchDocument } from "./types";

export async function upsertSearchDocument(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchDocument>> {
	const parsed = searchUpsertInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid search upsert input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveSearchStore(store).upsert(parsed.data);
}

export async function upsertSearchDocuments(
	input: unknown,
	store?: SearchStore,
): Promise<Result<SearchDocument[]>> {
	const parsed = searchUpsertBatchSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid search upsert batch input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveSearchStore(store).upsertBatch(parsed.data);
}

export async function deleteSearchDocument(
	input: unknown,
	store?: SearchStore,
): Promise<Result<{ deleted: boolean }>> {
	const parsed = searchDeleteInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid search delete input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return resolveSearchStore(store).delete(parsed.data);
}
