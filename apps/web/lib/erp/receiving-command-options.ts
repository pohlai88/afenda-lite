import type { ReceivingCommandOptions } from "@afenda/receiving";

import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createPurchaseOrderReceivingQueryPort } from "@/lib/erp/purchase-order-receiving-query-port";
import { createReceivingAuthorizationPort } from "@/lib/erp/receiving-authorization-port";

/** Composition-root options for `@afenda/receiving` public APIs. */
export function createReceivingCommandOptions(): ReceivingCommandOptions {
	return {
		authorization: createReceivingAuthorizationPort(),
		inventory: createInventoryCommandOptions(),
		masterAuthorization: createMasterDataAuthorizationPort(),
		purchaseOrderReceivingQuery: createPurchaseOrderReceivingQueryPort(),
	};
}
