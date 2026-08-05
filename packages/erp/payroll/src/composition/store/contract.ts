import type { PayrollOutputsStore } from "../../features/calculation/outputs.store";
import type { PayrollAssignmentsStore } from "../../features/employee-assignments/assignments.store";
import type { PayrollFinalSettlementStore } from "../../features/final-settlement/settlement.store";
import type { PayrollJobStore } from "../../features/payroll-jobs/jobs.store";
import type { PayrollRunsStore } from "../../features/payroll-runs/runs.store";
import type { PayrollSetupStore } from "../../features/payroll-setup/setup.store";
import type { PayrollReconciliationStore } from "../../features/reconciliation/reconciliation.store";
import type { PayrollRetroStore } from "../../features/retro-pay/retro.store";
import type { PayrollStatutoryFilingStore } from "../../features/statutory-filings/filing.store";
import type { PayrollStatutoryStore } from "../../features/statutory-rules/statutory.store";
import type { PayrollInputsStore } from "../../features/variable-inputs/inputs.store";
import type { PayrollWorkforceIngressStore } from "../../features/workforce-ingress/accepted-handoff.store";

export type PayrollStore = PayrollSetupStore &
	PayrollAssignmentsStore &
	PayrollInputsStore &
	PayrollRunsStore &
	PayrollStatutoryStore &
	PayrollOutputsStore &
	PayrollReconciliationStore &
	PayrollRetroStore &
	PayrollFinalSettlementStore &
	PayrollStatutoryFilingStore &
	PayrollWorkforceIngressStore &
	PayrollJobStore;

export type { PayrollOutputsStore } from "../../features/calculation/outputs.store";
export type { PayrollAssignmentsStore } from "../../features/employee-assignments/assignments.store";
export type { PayrollFinalSettlementStore } from "../../features/final-settlement/settlement.store";
export type { PayrollJobStore } from "../../features/payroll-jobs/jobs.store";
export type { PayrollRunsStore } from "../../features/payroll-runs/runs.store";
export type { PayrollSetupStore } from "../../features/payroll-setup/setup.store";
export type { PayrollReconciliationStore } from "../../features/reconciliation/reconciliation.store";
export type { PayrollRetroStore } from "../../features/retro-pay/retro.store";
export type { PayrollStatutoryFilingStore } from "../../features/statutory-filings/filing.store";
export type { PayrollStatutoryStore } from "../../features/statutory-rules/statutory.store";
export type { PayrollInputsStore } from "../../features/variable-inputs/inputs.store";
export type { PayrollWorkforceIngressStore } from "../../features/workforce-ingress/accepted-handoff.store";
