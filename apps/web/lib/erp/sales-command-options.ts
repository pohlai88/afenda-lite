import type { SalesCommandOptions } from "@afenda/sales";

import { createSalesAuthorizationPort } from "@/lib/erp/sales-authorization-port";
import { createSalesMasterDataPort } from "@/lib/erp/sales-master-data-port";

/** Composition-root options for `@afenda/sales` public APIs. */
export function createSalesCommandOptions(): SalesCommandOptions {
	return {
		authorization: createSalesAuthorizationPort(),
		masterData: createSalesMasterDataPort(),
	};
}
