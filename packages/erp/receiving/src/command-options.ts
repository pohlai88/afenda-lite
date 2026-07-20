import type { InventoryCommandOptions } from "@afenda/inventory";
import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { ReceivingAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderReceivingQueryPort,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveReceivingStore } from "./resolve-store";
import type { ReceivingStore } from "./store";

export type ReceivingCommandOptions = {
	store?: ReceivingStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	authorization?: ReceivingAuthorizationPort;
	masterAuthorization?: MasterAuthorizationPort;
	inventory?: InventoryCommandOptions;
	/**
	 * Required for purchase_order source create/post — apps/web injects SQL adapter;
	 * tests inject memory helper.
	 */
	purchaseOrderReceivingQuery?: PurchaseOrderReceivingQueryPort;
};

export function resolveCommandDeps(options: ReceivingCommandOptions = {}): {
	store: ReceivingStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: ReceivingAuthorizationPort | undefined;
	inventory: InventoryCommandOptions | undefined;
	purchaseOrderReceivingQuery: PurchaseOrderReceivingQueryPort | undefined;
} {
	return {
		store: resolveReceivingStore(options.store),
		ports: options.ports ?? createProductionMutationPorts(),
		masters:
			options.masters ??
			createMasterDataLookupPort(options.masterAuthorization),
		authorization: options.authorization,
		inventory: options.inventory,
		purchaseOrderReceivingQuery: options.purchaseOrderReceivingQuery,
	};
}
