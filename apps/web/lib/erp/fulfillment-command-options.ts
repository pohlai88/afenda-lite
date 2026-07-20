import type { FulfillmentCommandOptions } from "@afenda/fulfillment";

import { createFulfillmentAuthorizationPort } from "@/lib/erp/fulfillment-authorization-port";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createSalesFulfillmentQueryPort } from "@/lib/erp/sales-fulfillment-query-port";

/** Composition-root options for `@afenda/fulfillment` public APIs. */
export function createFulfillmentCommandOptions(): FulfillmentCommandOptions {
	return {
		authorization: createFulfillmentAuthorizationPort(),
		inventory: createInventoryCommandOptions(),
		masterAuthorization: createMasterDataAuthorizationPort(),
		sales: createSalesFulfillmentQueryPort(),
	};
}
