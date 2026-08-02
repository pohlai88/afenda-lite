import type { PayrollAssignmentsStore } from "../employee-assignments/assignments.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import type { PayrollInputsStore } from "./inputs.store";

export type PayrollVariableInputOperationStore = PayrollAssignmentsStore &
	PayrollInputsStore &
	PayrollSetupStore;
