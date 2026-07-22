import type { HumanResourcesAuthorizationPort } from "./authorization";
import { createProductionCurrencyLookup } from "./currency-lookup";
import type { CurrencyLookupPort, MutationPorts } from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveHumanResourcesStore } from "./resolve-store";
import type { HumanResourcesStore } from "./store";

export type HumanResourcesCommandOptions = {
	store?: HumanResourcesStore;
	ports?: MutationPorts;
	currency?: CurrencyLookupPort;
	authorization?: HumanResourcesAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveCurrencyLookup(
	currency?: CurrencyLookupPort,
): CurrencyLookupPort {
	return currency ?? createProductionCurrencyLookup();
}

export function resolveStore(store?: HumanResourcesStore): HumanResourcesStore {
	return resolveHumanResourcesStore(store);
}

export function resolveCommandDeps(
	options: HumanResourcesCommandOptions = {},
): {
	store: HumanResourcesStore;
	ports: MutationPorts;
	currency: CurrencyLookupPort;
	authorization: HumanResourcesAuthorizationPort | undefined;
} {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		currency: resolveCurrencyLookup(options.currency),
		authorization: options.authorization,
	};
}
