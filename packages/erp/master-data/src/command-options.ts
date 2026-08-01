import type { SearchCapability } from "@afenda/search";

import type { MasterAuthorizationPort } from "./authorization";
import { createUnavailableDependencyInspector } from "./capabilities/core-organization-masters/dependency";
import type { OrganizationDimensionStore } from "./capabilities/core-organization-masters/organization-dimension-store";
import type {
	ImportMutationContext,
	MasterDataStore,
} from "./capabilities/core-organization-masters/store";
import type { MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveMasterDataStore } from "./resolve-store";
import type { DependencyInspector } from "./types";

/** Durable dependency surface accepted by public master-data capabilities. */
export interface MasterDataCapabilityOptions {
	/** Composition-root injected — never import `@afenda/admin` here. */
	authorization?: MasterAuthorizationPort | undefined;
}

export type PublicMasterDataCapability<TInput, TResult> = (
	input: TInput,
	options?: MasterDataCapabilityOptions,
) => TResult;

/** Package-internal execution dependencies; never export from the root facade. */
export interface MasterCommandOptions extends MasterDataCapabilityOptions {
	dependencyInspector?: DependencyInspector | undefined;
	/** Package-internal import row context; never accept this from a public boundary. */
	importMutation?: ImportMutationContext | undefined;
	organizationDimensionStore?: OrganizationDimensionStore | undefined;
	ports?: MutationPorts | undefined;
	/** Optional derived search store for projectors (defaults to Drizzle). */
	searchCapability?: SearchCapability | undefined;
	store?: MasterDataStore | undefined;
}

export function definePublicMasterDataCapability<TInput, TResult>(
	capability: (input: TInput, options?: MasterCommandOptions) => TResult,
): PublicMasterDataCapability<TInput, TResult> {
	return (input, options) => capability(input, options);
}

export function definePublicMasterDataQuery<TInput, TResult>(
	capability: (input: TInput, options?: MasterQueryOptions) => TResult,
): PublicMasterDataCapability<TInput, TResult> {
	return (input, options) => capability(input, options);
}

export type MasterQueryOptions = Pick<
	MasterCommandOptions,
	"store" | "authorization"
>;

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: MasterDataStore): MasterDataStore {
	return resolveMasterDataStore(store);
}

export function resolveDependencyInspector(
	inspector?: DependencyInspector,
): DependencyInspector {
	return inspector ?? createUnavailableDependencyInspector();
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
