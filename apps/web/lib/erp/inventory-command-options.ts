import type { InventoryCommandOptions } from "@afenda/inventory";

import { createInventoryAuthorizationPort } from "@/lib/erp/inventory-authorization-port";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

/** Composition-root options for `@afenda/inventory` public APIs. */
export function createInventoryCommandOptions(): InventoryCommandOptions {
	return {
		authorization: createInventoryAuthorizationPort(),
		masterAuthorization: createMasterDataAuthorizationPort(),
	};
}
