import type { HumanResourcesLeaveStore } from "../leave/store-contract";
import type { HumanResourcesPerformanceStore } from "./store-contract";

export type HumanResourcesPerformanceCapabilityStore =
	HumanResourcesPerformanceStore &
		Pick<HumanResourcesLeaveStore, "getPrimaryManagerForEmployee">;

export type HumanResourcesPerformanceStoreMethod =
	keyof HumanResourcesPerformanceStore;

export type HumanResourcesPerformanceStoreProjection<
	TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
> = Pick<HumanResourcesPerformanceStore, TMethods[number]>;

export type HumanResourcesPerformanceAuthorizationStore = Pick<
	HumanResourcesPerformanceCapabilityStore,
	| "getPerformanceGoalById"
	| "getPerformanceReviewById"
	| "getPrimaryManagerForEmployee"
>;

export function projectPerformanceStore<
	const TMethods extends readonly HumanResourcesPerformanceStoreMethod[],
>(
	store: HumanResourcesPerformanceCapabilityStore,
	_methods: TMethods,
): HumanResourcesPerformanceStoreProjection<TMethods> {
	return store;
}

export function projectPerformanceAuthorizationStore(
	store: HumanResourcesPerformanceCapabilityStore,
): HumanResourcesPerformanceAuthorizationStore {
	return store;
}
