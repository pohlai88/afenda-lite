import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { PurchasingAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderCommitmentQueryPort,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolvePurchasingStore } from "./resolve-store";
import type { PurchasingStore } from "./store";

export type PurchasingCommandOptions = {
	store?: PurchasingStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: PurchasingAuthorizationPort;
	/** Forwarded to master-data public lookups (read permission). */
	masterAuthorization?: MasterAuthorizationPort;
	/**
	 * Required for `closePurchaseOrder` — apps/web injects SQL adapter;
	 * tests inject memory zero-commitment helper.
	 */
	commitmentQuery?: PurchaseOrderCommitmentQueryPort;
};

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
