import type { HumanResourcesCompensationStore } from "../store/compensation";
import type { HumanResourcesCoreStore } from "../store/core";
import type { HumanResourcesLeaveStore } from "../store/leave";
import type { HumanResourcesTimeStore } from "../store/time";

export type HumanResourcesPayrollHandoffStore = Pick<
	HumanResourcesCompensationStore,
	"getApprovedCompensationHandoff"
> &
	Pick<HumanResourcesCoreStore, "findAssignmentByEmploymentAsOf"> &
	Pick<
		HumanResourcesLeaveStore,
		"getApprovedLeaveHandoff" | "getPrimaryManagerForEmployee"
	> &
	Pick<HumanResourcesTimeStore, "getApprovedTimeHandoff">;

export type HumanResourcesPayrollHandoffStoreMethod =
	keyof HumanResourcesPayrollHandoffStore;

export type HumanResourcesPayrollHandoffStoreProjection<
	TMethods extends readonly HumanResourcesPayrollHandoffStoreMethod[],
> = Pick<HumanResourcesPayrollHandoffStore, TMethods[number]>;

export function projectPayrollHandoffStore<
	const TMethods extends readonly HumanResourcesPayrollHandoffStoreMethod[],
>(
	store: HumanResourcesPayrollHandoffStore,
	_methods: TMethods,
): HumanResourcesPayrollHandoffStoreProjection<TMethods> {
	return store;
}
