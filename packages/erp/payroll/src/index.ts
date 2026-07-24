import "server-only";

export {
	createPayrollEmployeeAssignment,
	getPayrollEmployeeAssignment,
} from "./assignments/employee-payroll-assignment";
export { createPayrollRecurringDeduction } from "./assignments/recurring-deduction";
export { createPayrollRecurringEarning } from "./assignments/recurring-earning";
export type {
	PayrollAuthorizationPort,
	PayrollPermission,
} from "./authorization";
export { type PayrollRunId, payrollRunIdSchema } from "./brands";
export type { PayrollCommandOptions } from "./command-options";
export {
	PAYROLL_ERROR_CODES,
	PAYROLL_ERROR_VALIDATION,
	type PayrollErrorCode,
	payrollErrorDetails,
} from "./error-codes";
export {
	createPayrollVariableInput,
	getPayrollVariableInput,
} from "./inputs/variable-input";
export {
	PAYROLL_PERMISSION_CODES,
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
} from "./permissions";
export type {
	AuditFactPort,
	MutationPorts,
	OutboxPort,
	PayrollEmployeeQueryPort,
	PayrollRunCalculatorPort,
	PayrollRunCalculatorResult,
} from "./ports";
export {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
	PAYROLL_CALCULATION_VERSION,
	verifyAccountingIdentities,
} from "./runs/calculation";
export {
	listPayrollExceptionsForRun,
	recordPayrollException,
} from "./runs/exception";
export { finalizePayrollRun } from "./runs/finalization";
export {
	closePayrollPeriod,
	createPayrollPeriod,
	getPayrollPeriod,
	listPayrollPeriods,
	updatePayrollPeriod,
} from "./runs/payroll-period";
export {
	createPayrollRun,
	getPayrollRun,
} from "./runs/payroll-run";
export { createProductionPayrollRunCalculator } from "./runs/production-run-calculator";
export { reversePayrollRun } from "./runs/reversal";
export { calculatePayrollRun } from "./runs/run-calculate-command";
export {
	payrollMutationContextSchema,
	payrollTenantContextSchema,
} from "./schemas";
export {
	archivePayrollCalendar,
	createPayrollCalendar,
	getPayrollCalendar,
	listPayrollCalendars,
	updatePayrollCalendar,
} from "./setup/calendar";
export {
	archivePayrollDeductionRule,
	createPayrollDeductionRule,
	getPayrollDeductionRule,
	supersedePayrollDeductionRule,
	updatePayrollDeductionRule,
} from "./setup/deduction-rule";
export {
	archivePayrollEarningRule,
	createPayrollEarningRule,
	getPayrollEarningRule,
	supersedePayrollEarningRule,
	updatePayrollEarningRule,
} from "./setup/earning-rule";
export {
	archivePayrollPayGroup,
	createPayrollPayGroup,
	getPayrollPayGroup,
	listPayrollPayGroups,
	updatePayrollPayGroup,
} from "./setup/pay-group";
export {
	archivePayrollStatutoryRule,
	createPayrollStatutoryRule,
	getPayrollStatutoryRule,
	supersedePayrollStatutoryRule,
	updatePayrollStatutoryRule,
} from "./setup/statutory-rule";
export type { PayrollMutationContext, PayrollTenantContext } from "./types";
