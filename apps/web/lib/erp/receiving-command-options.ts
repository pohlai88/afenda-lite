import type { ReceivingCommandOptions } from "@afenda/receiving";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createPurchaseOrderReceivingQueryPort } from "@/lib/erp/purchase-order-receiving-query-port";
import { createReceivingAuthorizationPort } from "@/lib/erp/receiving-authorization-port";

/** Composition-root options for `@afenda/receiving` public APIs. */
export function createReceivingCommandOptions(): ReceivingCommandOptions {
	return {
		authorization: createReceivingAuthorizationPort(),
		masterAuthorization: createMasterDataAuthorizationPort(),
		purchaseOrderReceivingQuery: createPurchaseOrderReceivingQueryPort(),
	};
}
