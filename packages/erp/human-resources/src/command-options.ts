import type { HumanResourcesAuthorizationPort } from "./authorization";
import type { MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveHumanResourcesStore } from "./resolve-store";
import type { HumanResourcesStore } from "./store";

export type HumanResourcesCommandOptions = {
	store?: HumanResourcesStore;
	ports?: MutationPorts;
	authorization?: HumanResourcesAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(store?: HumanResourcesStore): HumanResourcesStore {
	return resolveHumanResourcesStore(store);
}

export function resolveCommandDeps(
	options: HumanResourcesCommandOptions = {},
): {
	store: HumanResourcesStore;
	ports: MutationPorts;
	authorization: HumanResourcesAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		authorization: options.authorization,
	};
}
