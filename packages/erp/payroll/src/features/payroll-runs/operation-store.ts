import type { PayrollCommandOptions } from "../../kernel/execution/command-options";
import type { PayrollOutputsStore } from "../calculation/outputs.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import type { PayrollReconciliationStore } from "../reconciliation/reconciliation.store";
import type { PayrollRunsStore } from "./runs.store";

export type PayrollRunOperationStore = PayrollOutputsStore &
	PayrollReconciliationStore &
	PayrollRunsStore &
	PayrollSetupStore;

export type PayrollRunCommandOptions =
	PayrollCommandOptions<PayrollRunOperationStore>;
