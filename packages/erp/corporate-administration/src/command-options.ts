import type { CorporateAdministrationAuthorizationPort } from "./authorization";
import { createGenericGovernancePolicy } from "./governance-policy";
import type {
	CorporateAdministrationGovernancePolicyPort,
	CorporateAdministrationMasterLookupPort,
	CorporateAdministrationStore,
	MutationPorts,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveCorporateAdministrationStore } from "./resolve-store";

export type CorporateAdministrationCommandOptions = {
	store?: CorporateAdministrationStore;
	ports?: MutationPorts;
	masters?: CorporateAdministrationMasterLookupPort;
	governancePolicy?: CorporateAdministrationGovernancePolicyPort;
	authorization?: CorporateAdministrationAuthorizationPort;
};

export function resolvePorts(ports?: MutationPorts): MutationPorts {
	return ports ?? createProductionMutationPorts();
}

export function resolveStore(
	store?: CorporateAdministrationStore,
): CorporateAdministrationStore {
	return resolveCorporateAdministrationStore(store);
}

export function resolveCommandDeps(
	options: CorporateAdministrationCommandOptions,
) {
	return {
		store: resolveStore(options.store),
		ports: resolvePorts(options.ports),
		masters: options.masters,
		governancePolicy:
			options.governancePolicy ?? createGenericGovernancePolicy(),
		authorization: options.authorization,
	};
}
