import { errorResult } from "@afenda/errors";
import type { CurrencyLookupCapability } from "@afenda/human-resources";
import { getRefCurrencyByCode } from "@afenda/master-data";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

/** Adapts HR currency validation to the authorized master-data facade. */
export function createHumanResourcesCurrencyLookupPort(): CurrencyLookupCapability {
	const authorization = createMasterDataAuthorizationPort();
	return {
		async exists(input) {
			const result = await getRefCurrencyByCode(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					code: input.currencyCode,
				},
				{ authorization },
			);
			if (!result.ok) {
				return result;
			}
			return errorResult.ok(result.data !== null);
		},
	};
}
