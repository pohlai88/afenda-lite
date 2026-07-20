import type { FulfillmentCommandOptions } from "@afenda/fulfillment";

import { createFulfillmentAuthorizationPort } from "@/lib/erp/fulfillment-authorization-port";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

/** Composition-root options for `@afenda/fulfillment` public APIs. */
export function createFulfillmentCommandOptions(): FulfillmentCommandOptions {
	return {
		authorization: createFulfillmentAuthorizationPort(),
		masterAuthorization: createMasterDataAuthorizationPort(),
	};
}
