import type { SalesCommandOptions } from "@afenda/sales";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { createSalesAuthorizationPort } from "@/lib/erp/sales-authorization-port";

/** Composition-root options for `@afenda/sales` public APIs. */
export function createSalesCommandOptions(): SalesCommandOptions {
	return {
		authorization: createSalesAuthorizationPort(),
		masterAuthorization: createMasterDataAuthorizationPort(),
	};
}
