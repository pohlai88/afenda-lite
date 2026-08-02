import type { HumanResourcesComplianceStore } from "../store/compliance";
import type { HumanResourcesCoreStore } from "../store/core";
import type { HumanResourcesLearningStore } from "../store/learning";

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
