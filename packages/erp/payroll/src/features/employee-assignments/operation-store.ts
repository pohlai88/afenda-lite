import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import type { PayrollAssignmentsStore } from "./assignments.store";

export type PayrollEmployeeAssignmentsOperationStore = PayrollAssignmentsStore &
	PayrollSetupStore;
