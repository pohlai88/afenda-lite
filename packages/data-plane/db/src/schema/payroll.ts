import { createErpScaffoldTable } from "./scaffold-table";

/** Payroll mutation tables — sole mutator `@afenda/payroll`. */
export const payrollCalendar = createErpScaffoldTable("payroll_calendar");
export const payrollPayGroup = createErpScaffoldTable("payroll_pay_group");
export const payrollPeriod = createErpScaffoldTable("payroll_period");
export const payrollEmployeeAssignment = createErpScaffoldTable(
	"payroll_employee_assignment",
);
export const payrollEarningRule = createErpScaffoldTable(
	"payroll_earning_rule",
);
export const payrollDeductionRule = createErpScaffoldTable(
	"payroll_deduction_rule",
);
export const payrollStatutoryRule = createErpScaffoldTable(
	"payroll_statutory_rule",
);
export const payrollRecurringEarning = createErpScaffoldTable(
	"payroll_recurring_earning",
);
export const payrollRecurringDeduction = createErpScaffoldTable(
	"payroll_recurring_deduction",
);
export const payrollVariableInput = createErpScaffoldTable(
	"payroll_variable_input",
);
export const payrollRun = createErpScaffoldTable("payroll_run");
export const payrollRunEmployee = createErpScaffoldTable(
	"payroll_run_employee",
);
export const payrollResultLine = createErpScaffoldTable("payroll_result_line");
export const payrollStatutoryResult = createErpScaffoldTable(
	"payroll_statutory_result",
);
export const payrollException = createErpScaffoldTable("payroll_exception");
export const payrollPayslip = createErpScaffoldTable("payroll_payslip");
export const payrollAdjustment = createErpScaffoldTable("payroll_adjustment");
export const payrollReconciliation = createErpScaffoldTable(
	"payroll_reconciliation",
);
