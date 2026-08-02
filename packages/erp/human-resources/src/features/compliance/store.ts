import type { HumanResourcesLearningStore } from "../learning/store-contract";
import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesComplianceStore } from "./store-contract";

export type HumanResourcesComplianceCapabilityStore =
	HumanResourcesComplianceStore &
		Pick<HumanResourcesCoreStore, "getEmployeeById"> &
		Pick<HumanResourcesLearningStore, "listExpiringCertifications">;

export type HumanResourcesComplianceStoreMethod =
	keyof HumanResourcesComplianceCapabilityStore;

export type HumanResourcesComplianceStoreProjection<
	TMethods extends readonly HumanResourcesComplianceStoreMethod[],
> = Pick<HumanResourcesComplianceCapabilityStore, TMethods[number]>;

export function projectComplianceStore<
	const TMethods extends readonly HumanResourcesComplianceStoreMethod[],
>(
	store: HumanResourcesComplianceCapabilityStore,
	_methods: TMethods,
): HumanResourcesComplianceStoreProjection<TMethods> {
	return store;
}
