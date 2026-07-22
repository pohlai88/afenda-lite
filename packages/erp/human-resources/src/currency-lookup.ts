import { ok, type Result } from "@afenda/errors/result";
import { createDrizzleMasterDataStore } from "@afenda/master-data/adapters/drizzle";

import type { CurrencyLookupPort } from "./ports";

const MEMORY_CURRENCY_CODES = new Set([
	"USD",
	"EUR",
	"GBP",
	"SGD",
	"MYR",
	"AUD",
	"CAD",
	"JPY",
]);

export function createMemoryCurrencyLookup(): CurrencyLookupPort {
	return {
		async exists(currencyCode: string): Promise<Result<boolean>> {
			return ok(MEMORY_CURRENCY_CODES.has(currencyCode.toUpperCase()));
		},
	};
}

export function createProductionCurrencyLookup(): CurrencyLookupPort {
	const store = createDrizzleMasterDataStore();
	return {
		async exists(currencyCode: string): Promise<Result<boolean>> {
			const result = await store.getRefCurrencyByCode(
				currencyCode.toUpperCase(),
			);
			if (!result.ok) {
				return result;
			}
			return ok(result.data !== null);
		},
	};
}
