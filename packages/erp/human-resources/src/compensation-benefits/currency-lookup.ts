import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { CurrencyLookupPort } from "../ports";

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
		exists(input): Promise<Result<boolean>> {
			return Promise.resolve(
				errorResult.ok(
					MEMORY_CURRENCY_CODES.has(input.currencyCode.toUpperCase()),
				),
			);
		},
	};
}

/** Fail-closed default used when the application omits its reference adapter. */
export function createUnavailableCurrencyLookup(): CurrencyLookupPort {
	return {
		exists(): Promise<Result<boolean>> {
			return Promise.resolve(
				errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
					),
				}),
			);
		},
	};
}
