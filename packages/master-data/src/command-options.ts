import type { SearchStore } from "@afenda/search";

import type { MasterAuthorizationPort } from "./authorization";
import { createEmptyDependencyInspector } from "./dependency";
import type { MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveMasterDataStore } from "./resolve-store";
import type { MasterDataStore } from "./store";
import type { DependencyInspector } from "./types";

export type MasterCommandOptions = {
	store?: MasterDataStore;
	ports?: MutationPorts;
	dependencyInspector?: DependencyInspector;
	/** Optional derived search store for projectors (defaults to Drizzle). */
	searchStore?: SearchStore;
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: MasterAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: MasterDataStore): MasterDataStore {
	return resolveMasterDataStore(store);
}

export function resolveDependencyInspector(
	inspector?: DependencyInspector,
): DependencyInspector {
	return inspector ?? createEmptyDependencyInspector();
}

export function resolveCommandDeps(options: MasterCommandOptions = {}): {
	store: MasterDataStore;
	ports: MutationPorts;
	dependencyInspector: DependencyInspector;
	authorization: MasterAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		dependencyInspector: resolveDependencyInspector(
			options.dependencyInspector,
		),
		authorization: options.authorization,
	};
}
