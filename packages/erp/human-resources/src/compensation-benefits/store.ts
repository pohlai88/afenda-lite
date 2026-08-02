import type { HumanResourcesCompensationStore } from "../store/compensation";
import type { HumanResourcesLeaveStore } from "../store/leave";

export type HumanResourcesCompensationBenefitsCapabilityStore =
	HumanResourcesCompensationStore &
		Pick<HumanResourcesLeaveStore, "getPrimaryManagerForEmployee">;

export type HumanResourcesCompensationResourceStore = Pick<
	HumanResourcesCompensationBenefitsCapabilityStore,
	| "getBenefitEnrollment"
	| "getBenefitEnrollmentDependent"
	| "getCompensationReview"
	| "getEmployeeCompensation"
	| "getPrimaryManagerForEmployee"
>;

export type HumanResourcesCompensationBenefitsStoreMethod =
	keyof HumanResourcesCompensationBenefitsCapabilityStore;

export type HumanResourcesCompensationBenefitsStoreProjection<
	TMethods extends readonly HumanResourcesCompensationBenefitsStoreMethod[],
> = Pick<HumanResourcesCompensationBenefitsCapabilityStore, TMethods[number]>;

export function projectCompensationBenefitsStore<
	const TMethods extends
		readonly HumanResourcesCompensationBenefitsStoreMethod[],
>(
	store: HumanResourcesCompensationBenefitsCapabilityStore,
	_methods: TMethods,
): HumanResourcesCompensationBenefitsStoreProjection<TMethods> {
	return store;
}

export function projectCompensationResourceStore(
	store: HumanResourcesCompensationBenefitsCapabilityStore,
): HumanResourcesCompensationResourceStore {
	return store;
}
