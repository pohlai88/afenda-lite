import type { InventoryCommandOptions } from "@afenda/inventory";
import type { MasterAuthorizationPort } from "@afenda/master-data";
import { createMasterDataLookupPort } from "../composition/master-lookup";
import { createProductionMutationPorts } from "../composition/production-ports";
import { resolveFulfillmentStore } from "../composition/store/resolve-store";
import type { FulfillmentStore } from "../features/deliveries/deliveries.store";
import type {
	MasterLookupPort,
	MutationPorts,
	SalesFulfillmentQueryPort,
} from "../kernel/contracts/ports";
import type { FulfillmentAuthorizationPort } from "../kernel/execution/authorization";

export interface FulfillmentCommandOptions {
	authorization?: FulfillmentAuthorizationPort;
	inventory?: InventoryCommandOptions;
	masterAuthorization?: MasterAuthorizationPort;
	masters?: MasterLookupPort;
	ports?: MutationPorts;
	sales?: SalesFulfillmentQueryPort;
	store?: FulfillmentStore;
}

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
