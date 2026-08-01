import "server-only";

export type {
	PayrollAuthorizationPort,
	PayrollPermission,
} from "./authorization";
export { type PayrollRunId, payrollRunIdSchema } from "./brands";
export type { PayrollCommandOptions } from "./command-options";
export {
	type ApprovedPayrollHandoffParsed,
	type ApprovedPayrollHandoffParsedComponent,
	type ParsedApprovedPayrollHandoffInput,
	type ParsedPayrollHandoffComponent,
	parseApprovedPayrollHandoff,
	parseApprovedPayrollHandoffInput,
	toPayrollRoundingPolicy,
} from "./inputs/parse-approved-payroll-handoff";
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
	PayrollHrHandoffInputPort,
	PayrollRunCalculatorPort,
	PayrollRunCalculatorResult,
} from "./ports";
export {
	archivePayrollCalendar,
	archivePayrollDeductionRule,
	archivePayrollEarningRule,
	archivePayrollPayGroup,
	archivePayrollStatutoryRule,
	calculatePayrollRun,
	closePayrollPeriod,
	createPayrollCalendar,
	createPayrollDeductionRule,
	createPayrollEarningRule,
	createPayrollEmployeeAssignment,
	createPayrollPayGroup,
	createPayrollPeriod,
	createPayrollRecurringDeduction,
	createPayrollRecurringEarning,
	createPayrollRun,
	createPayrollStatutoryRule,
	createPayrollVariableInput,
	finalizePayrollRun,
	getPayrollCalendar,
	getPayrollDeductionRule,
	getPayrollEarningRule,
	getPayrollEmployeeAssignment,
	getPayrollPayGroup,
	getPayrollPeriod,
	getPayrollRun,
	getPayrollStatutoryRule,
	getPayrollVariableInput,
	listPayrollCalendars,
	listPayrollExceptionsForRun,
	listPayrollPayGroups,
	listPayrollPeriods,
	recordPayrollException,
	reversePayrollRun,
	supersedePayrollDeductionRule,
	supersedePayrollEarningRule,
	supersedePayrollStatutoryRule,
	updatePayrollCalendar,
	updatePayrollDeductionRule,
	updatePayrollEarningRule,
	updatePayrollPayGroup,
	updatePayrollPeriod,
	updatePayrollStatutoryRule,
} from "./public-capabilities";
export type {
	PayrollAuthorizationCapability,
	PayrollCapabilityComposition,
	PayrollWorkforceCapability,
} from "./public-contracts";
export {
	createPayrollCapabilityOptions,
	type PayrollCapabilityOptions,
} from "./public-execution-context";
export {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
	PAYROLL_CALCULATION_VERSION,
	verifyAccountingIdentities,
} from "./runs/calculation";
export { createProductionPayrollRunCalculator } from "./runs/production-run-calculator";
export {
	payrollMutationContextSchema,
	payrollTenantContextSchema,
} from "./schemas";
export type { PayrollMutationContext, PayrollTenantContext } from "./types";
