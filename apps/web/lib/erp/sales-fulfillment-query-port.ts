import type { SalesFulfillmentQueryPort } from "@afenda/fulfillment";
import { getFulfillableSalesOrder } from "@afenda/sales";

import { createSalesCommandOptions } from "@/lib/erp/sales-command-options";

/** Composition-root Sales fulfillable-order adapter for `@afenda/fulfillment`. */
export function createSalesFulfillmentQueryPort(): SalesFulfillmentQueryPort {
	return {
		async getFulfillableSalesOrder(input) {
			return getFulfillableSalesOrder(input, createSalesCommandOptions());
		},
	};
}
