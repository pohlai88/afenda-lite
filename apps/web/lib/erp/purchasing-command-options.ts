import type { PurchasingCommandOptions } from "@afenda/purchasing";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createPurchasingAuthorizationPort } from "@/lib/erp/purchasing-authorization-port";

/** Composition-root options for `@afenda/purchasing` public APIs. */
export function createPurchasingCommandOptions(): PurchasingCommandOptions {
	return {
		authorization: createPurchasingAuthorizationPort(),
		masterAuthorization: createMasterDataAuthorizationPort(),
	};
}
