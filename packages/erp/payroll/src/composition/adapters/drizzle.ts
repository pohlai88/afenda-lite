import { drizzleOutputsMethods } from "../../features/calculation/outputs.drizzle";
import { drizzleAssignmentsMethods } from "../../features/employee-assignments/assignments.drizzle";
import { drizzleFinalSettlementMethods } from "../../features/final-settlement/settlement.drizzle";
import { drizzleJobsMethods } from "../../features/payroll-jobs/jobs.drizzle";
import { drizzleRunsMethods } from "../../features/payroll-runs/runs.drizzle";
import { drizzleSetupMethods } from "../../features/payroll-setup/setup.drizzle";
import { drizzleReconciliationMethods } from "../../features/reconciliation/reconciliation.drizzle";
import { drizzleRetroMethods } from "../../features/retro-pay/retro.drizzle";
import { drizzleStatutoryFilingMethods } from "../../features/statutory-filings/filing.drizzle";
import { drizzleStatutoryMethods } from "../../features/statutory-rules/statutory.drizzle";
import { drizzleInputsMethods } from "../../features/variable-inputs/inputs.drizzle";
import { drizzleWorkforceIngressMethods } from "../../features/workforce-ingress/accepted-handoff.drizzle";
import { composeStoreSlices } from "../store/compose-slices";
import type { PayrollStore } from "../store/contract";

/** Composition root only. Domain persistence lives in one adapter per payroll subdomain. */
export function createDrizzlePayrollStore(): PayrollStore {
	const store = composeStoreSlices(
		drizzleSetupMethods,
		drizzleAssignmentsMethods,
		drizzleInputsMethods,
		drizzleWorkforceIngressMethods,
		drizzleRunsMethods,
		drizzleStatutoryMethods,
		drizzleOutputsMethods,
		drizzleReconciliationMethods,
		drizzleRetroMethods,
		drizzleFinalSettlementMethods,
		drizzleStatutoryFilingMethods,
		drizzleJobsMethods,
	);

	return store satisfies PayrollStore;
}
