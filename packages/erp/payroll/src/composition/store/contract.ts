import type { PayrollOutputsStore } from "../../features/calculation/outputs.store";
import type { PayrollAssignmentsStore } from "../../features/employee-assignments/assignments.store";
import type { PayrollRunsStore } from "../../features/payroll-runs/runs.store";
import type { PayrollSetupStore } from "../../features/payroll-setup/setup.store";
import type { PayrollReconciliationStore } from "../../features/reconciliation/reconciliation.store";
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
	PayrollWorkforceIngressStore;

export type { PayrollOutputsStore } from "../../features/calculation/outputs.store";
export type { PayrollAssignmentsStore } from "../../features/employee-assignments/assignments.store";
export type { PayrollRunsStore } from "../../features/payroll-runs/runs.store";
export type { PayrollSetupStore } from "../../features/payroll-setup/setup.store";
export type { PayrollReconciliationStore } from "../../features/reconciliation/reconciliation.store";
export type { PayrollStatutoryStore } from "../../features/statutory-rules/statutory.store";
export type { PayrollInputsStore } from "../../features/variable-inputs/inputs.store";
export type { PayrollWorkforceIngressStore } from "../../features/workforce-ingress/accepted-handoff.store";
