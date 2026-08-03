import type { MasterAuthorizationPort } from "@afenda/master-data";
import { createMasterDataLookupPort } from "../composition/master-lookup";
import { createProductionMutationPorts } from "../composition/production-ports";
import { resolvePurchasingStore } from "../composition/store/resolve-store";
import type { PurchasingStore } from "../features/orders/orders.store";
import type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderCommitmentQueryPort,
} from "../kernel/contracts/ports";
import type { PurchasingAuthorizationPort } from "../kernel/execution/authorization";

export interface PurchasingCommandOptions {
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: PurchasingAuthorizationPort;
	/**
	 * Required for `closePurchaseOrder` — apps/web injects SQL adapter;
	 * tests inject memory zero-commitment helper.
	 */
	commitmentQuery?: PurchaseOrderCommitmentQueryPort;
	/** Forwarded to master-data public lookups (read permission). */
	masterAuthorization?: MasterAuthorizationPort;
	masters?: MasterLookupPort;
	ports?: MutationPorts;
	store?: PurchasingStore;
}

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: PurchasingStore): PurchasingStore {
	return resolvePurchasingStore(store);
}

export function resolveMasters(
	masters?: MasterLookupPort,
	masterAuthorization?: MasterAuthorizationPort,
): MasterLookupPort {
	return masters ?? createMasterDataLookupPort(masterAuthorization);
}

export function resolveCommandDeps(options: PurchasingCommandOptions = {}): {
	store: PurchasingStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: PurchasingAuthorizationPort | undefined;
	commitmentQuery: PurchaseOrderCommitmentQueryPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		masters: resolveMasters(options.masters, options.masterAuthorization),
		authorization: options.authorization,
		commitmentQuery: options.commitmentQuery,
	};
}
