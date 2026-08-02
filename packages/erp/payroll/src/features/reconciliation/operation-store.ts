import type { PayrollOutputsStore } from "../calculation/outputs.store";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollReconciliationStore } from "./reconciliation.store";

export type PayrollReconciliationOperationStore = PayrollOutputsStore &
	PayrollReconciliationStore &
	PayrollRunsStore;
