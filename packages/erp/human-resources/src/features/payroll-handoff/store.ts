import type { HumanResourcesCompensationStore } from "../compensation-benefits/store-contract";
import type { HumanResourcesLeaveStore } from "../leave/store-contract";
import type { HumanResourcesTimeStore } from "../time/store-contract";
import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";

export type HumanResourcesPayrollHandoffStore = Pick<
	HumanResourcesCompensationStore,
	"getApprovedCompensationHandoff"
> &
	Pick<
		HumanResourcesCoreStore,
		| "findAssignmentByEmploymentAsOf"
		| "findEmploymentByEmployeeAsOf"
		| "listEmploymentStatusHistory"
	> &
	Pick<
		HumanResourcesLeaveStore,
		| "getApprovedLeaveHandoff"
		| "getPrimaryManagerForEmployee"
		| "listLeaveRequests"
	> &
	Pick<
		HumanResourcesTimeStore,
		"findTimesheetForEmployeePeriod" | "getApprovedTimeHandoff"
	>;

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
