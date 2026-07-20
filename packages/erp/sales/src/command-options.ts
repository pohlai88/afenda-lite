import type { MasterAuthorizationPort } from "@afenda/master-data";

import type { SalesAuthorizationPort } from "./authorization";
import { createMasterDataLookupPort } from "./master-lookup";
import type { MasterLookupPort, MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveSalesStore } from "./resolve-store";
import type { SalesStore } from "./store";

export type SalesCommandOptions = {
	store?: SalesStore;
	ports?: MutationPorts;
	masters?: MasterLookupPort;
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: SalesAuthorizationPort;
	/** Forwarded to master-data public lookups (read permission). */
	masterAuthorization?: MasterAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: SalesStore): SalesStore {
	return resolveSalesStore(store);
}

export function resolveMasters(
	masters?: MasterLookupPort,
	masterAuthorization?: MasterAuthorizationPort,
): MasterLookupPort {
	return masters ?? createMasterDataLookupPort(masterAuthorization);
}

export function resolveCommandDeps(options: SalesCommandOptions = {}): {
	store: SalesStore;
	ports: MutationPorts;
	masters: MasterLookupPort;
	authorization: SalesAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		masters: resolveMasters(options.masters, options.masterAuthorization),
		authorization: options.authorization,
	};
}
