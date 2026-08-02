import type { HumanResourcesLeaveStore } from "../store/leave";
import type { HumanResourcesTalentStore } from "../store/talent";

export type HumanResourcesTalentCapabilityStore = HumanResourcesTalentStore &
	Pick<HumanResourcesLeaveStore, "getPrimaryManagerForEmployee">;

export type HumanResourcesTalentStoreMethod = keyof HumanResourcesTalentStore;
export type HumanResourcesTalentStoreProjection<
	TMethods extends readonly HumanResourcesTalentStoreMethod[],
> = Pick<HumanResourcesTalentStore, TMethods[number]>;

export type HumanResourcesTalentAuthorizationStore = Pick<
	HumanResourcesTalentCapabilityStore,
	| "getCareerPlanActionById"
	| "getCareerPlanById"
	| "getCompetencyAssessmentById"
	| "getPrimaryManagerForEmployee"
	| "getTalentProfileById"
>;

export function projectTalentStore<
	const TMethods extends readonly HumanResourcesTalentStoreMethod[],
>(
	store: HumanResourcesTalentCapabilityStore,
	_methods: TMethods,
): HumanResourcesTalentStoreProjection<TMethods> {
	return store;
}

export function projectTalentAuthorizationStore(
	store: HumanResourcesTalentCapabilityStore,
): HumanResourcesTalentAuthorizationStore {
	return store;
}
