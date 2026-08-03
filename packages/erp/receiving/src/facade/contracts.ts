import type { InventoryCommandOptions } from "@afenda/inventory";
import type { MasterAuthorizationPort } from "@afenda/master-data";
import { createMasterDataLookupPort } from "../composition/master-lookup";
import { createProductionMutationPorts } from "../composition/production-ports";
import { resolveReceivingStore } from "../composition/store/resolve-store";
import type { ReceivingStore } from "../features/receipts/receipts.store";
import type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderReceivingQueryPort,
} from "../kernel/contracts/ports";
import type { ReceivingAuthorizationPort } from "../kernel/execution/authorization";

export interface ReceivingCommandOptions {
	authorization?: ReceivingAuthorizationPort;
	inventory?: InventoryCommandOptions;
	masterAuthorization?: MasterAuthorizationPort;
	masters?: MasterLookupPort;
	ports?: MutationPorts;
	/**
	 * Required for purchase_order source create/post — apps/web injects SQL adapter;
	 * tests inject memory helper.
	 */
	purchaseOrderReceivingQuery?: PurchaseOrderReceivingQueryPort;
	store?: ReceivingStore;
}

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
