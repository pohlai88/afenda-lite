import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { InventoryAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type { MasterLookupPort, MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveInventoryStore } from "./resolve-store";
import type { InventoryStore } from "./store";

export type InventoryCommandOptions = {
	store?: InventoryStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: InventoryAuthorizationPort;
	/** Forwarded to master-data public lookups (read permission). */
	masterAuthorization?: MasterAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: InventoryStore): InventoryStore {
	return resolveInventoryStore(store);
}

export function resolveMasters(
	masters?: MasterLookupPort,
	masterAuthorization?: MasterAuthorizationPort,
): MasterLookupPort {
	return masters ?? createMasterDataLookupPort(masterAuthorization);
}

export function resolveCommandDeps(options: InventoryCommandOptions = {}): {
	store: InventoryStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: InventoryAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		masters: resolveMasters(options.masters, options.masterAuthorization),
		authorization: options.authorization,
	};
}
