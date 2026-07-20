import type { InventoryCommandOptions } from "@afenda/inventory";
import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { FulfillmentAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type {
	MasterLookupPort,
	MutationPorts,
	SalesFulfillmentQueryPort,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveFulfillmentStore } from "./resolve-store";
import type { FulfillmentStore } from "./store";

export type FulfillmentCommandOptions = {
	store?: FulfillmentStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	authorization?: FulfillmentAuthorizationPort;
	masterAuthorization?: MasterAuthorizationPort;
	inventory?: InventoryCommandOptions;
	sales?: SalesFulfillmentQueryPort;
};

export function resolveCommandDeps(options: FulfillmentCommandOptions = {}): {
	store: FulfillmentStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: FulfillmentAuthorizationPort | undefined;
	inventory: InventoryCommandOptions | undefined;
	sales: SalesFulfillmentQueryPort | undefined;
} {
	return {
		store: resolveFulfillmentStore(options.store),
		ports: options.ports ?? createProductionMutationPorts(),
		masters:
			options.masters ??
			createMasterDataLookupPort(options.masterAuthorization),
		authorization: options.authorization,
		inventory: options.inventory,
		sales: options.sales,
	};
}
