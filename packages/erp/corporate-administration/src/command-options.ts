import type { CorporateAdministrationAuthorizationPort } from "./authorization";
import { createDrizzleCorporateAdministrationUnitOfWork } from "./adapters/drizzle/unit-of-work";
import { createMemoryCorporateAdministrationUnitOfWork } from "./adapters/memory/unit-of-work";
import { createGenericGovernancePolicy } from "./governance-policy";
import {
	MemoryCorporateAdministrationStore,
} from "./memory-store";
import type {
	CorporateAdministrationGovernancePolicyPort,
	CorporateAdministrationMasterLookupPort,
	CorporateAdministrationStore,
	MutationPorts,
} from "./ports";
import { createProductionMutationPorts } from "./production-ports";
import { resolveCorporateAdministrationStore } from "./resolve-store";
import type { CorporateAdministrationUnitOfWork } from "./unit-of-work";

export type CorporateAdministrationCommandOptions = {
	store?: CorporateAdministrationStore;
	uow?: CorporateAdministrationUnitOfWork;
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

export function resolveUnitOfWork(
	options: CorporateAdministrationCommandOptions,
	store: CorporateAdministrationStore,
): CorporateAdministrationUnitOfWork {
	if (options.uow !== undefined) {
		return options.uow;
	}
	if (store instanceof MemoryCorporateAdministrationStore) {
		return createMemoryCorporateAdministrationUnitOfWork(store);
	}
	return createDrizzleCorporateAdministrationUnitOfWork(store);
}

export function resolveCommandDeps(
	options: CorporateAdministrationCommandOptions,
) {
	const store = resolveStore(options.store);
	return {
		store,
		uow: resolveUnitOfWork(options, store),
		ports: resolvePorts(options.ports),
		masters: options.masters,
		governancePolicy:
			options.governancePolicy ?? createGenericGovernancePolicy(),
		authorization: options.authorization,
	};
}
