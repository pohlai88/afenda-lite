import type { createDrizzlePayrollStore } from "../composition/adapters/drizzle";
import {
	createPayrollEmployeeAssignment as createPayrollEmployeeAssignmentInternal,
	getPayrollEmployeeAssignment as getPayrollEmployeeAssignmentInternal,
} from "../features/employee-assignments/employee-payroll-assignment";
import { createPayrollRecurringDeduction as createPayrollRecurringDeductionInternal } from "../features/employee-assignments/recurring-deduction";
import { createPayrollRecurringEarning as createPayrollRecurringEarningInternal } from "../features/employee-assignments/recurring-earning";
import {
	listPayrollExceptionsForRun as listPayrollExceptionsForRunInternal,
	recordPayrollException as recordPayrollExceptionInternal,
} from "../features/payroll-runs/exception";
import { finalizePayrollRun as finalizePayrollRunInternal } from "../features/payroll-runs/finalization";
import {
	closePayrollPeriod as closePayrollPeriodInternal,
	createPayrollPeriod as createPayrollPeriodInternal,
	getPayrollPeriod as getPayrollPeriodInternal,
	listPayrollPeriods as listPayrollPeriodsInternal,
	updatePayrollPeriod as updatePayrollPeriodInternal,
} from "../features/payroll-runs/payroll-period";
import {
	createPayrollRun as createPayrollRunInternal,
	getPayrollRun as getPayrollRunInternal,
} from "../features/payroll-runs/payroll-run";
import { reversePayrollRun as reversePayrollRunInternal } from "../features/payroll-runs/reversal";
import { calculatePayrollRun as calculatePayrollRunInternal } from "../features/payroll-runs/run-calculate-command";
import {
	archivePayrollCalendar as archivePayrollCalendarInternal,
	createPayrollCalendar as createPayrollCalendarInternal,
	getPayrollCalendar as getPayrollCalendarInternal,
	listPayrollCalendars as listPayrollCalendarsInternal,
	updatePayrollCalendar as updatePayrollCalendarInternal,
} from "../features/payroll-setup/calendar";
import {
	archivePayrollDeductionRule as archivePayrollDeductionRuleInternal,
	createPayrollDeductionRule as createPayrollDeductionRuleInternal,
	getPayrollDeductionRule as getPayrollDeductionRuleInternal,
	supersedePayrollDeductionRule as supersedePayrollDeductionRuleInternal,
	updatePayrollDeductionRule as updatePayrollDeductionRuleInternal,
} from "../features/payroll-setup/deduction-rule";
import {
	archivePayrollEarningRule as archivePayrollEarningRuleInternal,
	createPayrollEarningRule as createPayrollEarningRuleInternal,
	getPayrollEarningRule as getPayrollEarningRuleInternal,
	supersedePayrollEarningRule as supersedePayrollEarningRuleInternal,
	updatePayrollEarningRule as updatePayrollEarningRuleInternal,
} from "../features/payroll-setup/earning-rule";
import {
	archivePayrollPayGroup as archivePayrollPayGroupInternal,
	createPayrollPayGroup as createPayrollPayGroupInternal,
	getPayrollPayGroup as getPayrollPayGroupInternal,
	listPayrollPayGroups as listPayrollPayGroupsInternal,
	updatePayrollPayGroup as updatePayrollPayGroupInternal,
} from "../features/payroll-setup/pay-group";
import {
	archivePayrollStatutoryRule as archivePayrollStatutoryRuleInternal,
	createPayrollStatutoryRule as createPayrollStatutoryRuleInternal,
	getPayrollStatutoryRule as getPayrollStatutoryRuleInternal,
	supersedePayrollStatutoryRule as supersedePayrollStatutoryRuleInternal,
	updatePayrollStatutoryRule as updatePayrollStatutoryRuleInternal,
} from "../features/payroll-setup/statutory-rule";
import {
	getOwnPayrollPayslip as getOwnPayrollPayslipInternal,
	getPayrollPayslip as getPayrollPayslipInternal,
} from "../features/payslips/payslip";
import {
	listPayrollReconciliationsForRun as listPayrollReconciliationsForRunInternal,
	recordPayrollReconciliation as recordPayrollReconciliationInternal,
	resolvePayrollReconciliation as resolvePayrollReconciliationInternal,
} from "../features/reconciliation/reconciliation.command";
import {
	createPayrollVariableInput as createPayrollVariableInputInternal,
	getPayrollVariableInput as getPayrollVariableInputInternal,
} from "../features/variable-inputs/variable-input";
import { ingestApprovedPayrollHandoff as ingestApprovedPayrollHandoffInternal } from "../features/workforce-ingress/ingest-approved-handoff";
import type { PayrollCommandOptions } from "../kernel/execution/command-options";
import type { PayrollCapabilityOptions } from "./context";
import { resolvePayrollCapabilityOptions } from "./context";

type InternalPayrollOperation<TInput, TOutput> = (
	input: TInput,
	options?: PayrollCommandOptions<ReturnType<typeof createDrizzlePayrollStore>>,
) => TOutput;

function bindPayrollOperation<TInput, TOutput>(
	operation: InternalPayrollOperation<TInput, TOutput>,
): (input: TInput, context: PayrollCapabilityOptions) => TOutput {
	return (input, context) =>
		operation(input, resolvePayrollCapabilityOptions(context));
}

export const createPayrollEmployeeAssignment = bindPayrollOperation(
	createPayrollEmployeeAssignmentInternal,
);
export const getPayrollEmployeeAssignment = bindPayrollOperation(
	getPayrollEmployeeAssignmentInternal,
);
export const createPayrollRecurringDeduction = bindPayrollOperation(
	createPayrollRecurringDeductionInternal,
);
export const createPayrollRecurringEarning = bindPayrollOperation(
	createPayrollRecurringEarningInternal,
);
export const createPayrollVariableInput = bindPayrollOperation(
	createPayrollVariableInputInternal,
);
export const getPayrollVariableInput = bindPayrollOperation(
	getPayrollVariableInputInternal,
);
export const ingestApprovedPayrollHandoff = bindPayrollOperation(
	ingestApprovedPayrollHandoffInternal,
);
export const getOwnPayrollPayslip = bindPayrollOperation(
	getOwnPayrollPayslipInternal,
);
export const getPayrollPayslip = bindPayrollOperation(
	getPayrollPayslipInternal,
);
export const recordPayrollReconciliation = bindPayrollOperation(
	recordPayrollReconciliationInternal,
);
export const resolvePayrollReconciliation = bindPayrollOperation(
	resolvePayrollReconciliationInternal,
);
export const listPayrollReconciliationsForRun = bindPayrollOperation(
	listPayrollReconciliationsForRunInternal,
);
export const recordPayrollException = bindPayrollOperation(
	recordPayrollExceptionInternal,
);
export const listPayrollExceptionsForRun = bindPayrollOperation(
	listPayrollExceptionsForRunInternal,
);
export const finalizePayrollRun = bindPayrollOperation(
	finalizePayrollRunInternal,
);
export const createPayrollPeriod = bindPayrollOperation(
	createPayrollPeriodInternal,
);
export const updatePayrollPeriod = bindPayrollOperation(
	updatePayrollPeriodInternal,
);
export const closePayrollPeriod = bindPayrollOperation(
	closePayrollPeriodInternal,
);
export const getPayrollPeriod = bindPayrollOperation(getPayrollPeriodInternal);
export const listPayrollPeriods = bindPayrollOperation(
	listPayrollPeriodsInternal,
);
export const createPayrollRun = bindPayrollOperation(createPayrollRunInternal);
export const getPayrollRun = bindPayrollOperation(getPayrollRunInternal);
export const reversePayrollRun = bindPayrollOperation(
	reversePayrollRunInternal,
);
export const calculatePayrollRun = bindPayrollOperation(
	calculatePayrollRunInternal,
);
export const createPayrollCalendar = bindPayrollOperation(
	createPayrollCalendarInternal,
);
export const updatePayrollCalendar = bindPayrollOperation(
	updatePayrollCalendarInternal,
);
export const archivePayrollCalendar = bindPayrollOperation(
	archivePayrollCalendarInternal,
);
export const getPayrollCalendar = bindPayrollOperation(
	getPayrollCalendarInternal,
);
export const listPayrollCalendars = bindPayrollOperation(
	listPayrollCalendarsInternal,
);
export const createPayrollDeductionRule = bindPayrollOperation(
	createPayrollDeductionRuleInternal,
);
export const updatePayrollDeductionRule = bindPayrollOperation(
	updatePayrollDeductionRuleInternal,
);
export const archivePayrollDeductionRule = bindPayrollOperation(
	archivePayrollDeductionRuleInternal,
);
export const supersedePayrollDeductionRule = bindPayrollOperation(
	supersedePayrollDeductionRuleInternal,
);
export const getPayrollDeductionRule = bindPayrollOperation(
	getPayrollDeductionRuleInternal,
);
export const createPayrollEarningRule = bindPayrollOperation(
	createPayrollEarningRuleInternal,
);
export const updatePayrollEarningRule = bindPayrollOperation(
	updatePayrollEarningRuleInternal,
);
export const archivePayrollEarningRule = bindPayrollOperation(
	archivePayrollEarningRuleInternal,
);
export const supersedePayrollEarningRule = bindPayrollOperation(
	supersedePayrollEarningRuleInternal,
);
export const getPayrollEarningRule = bindPayrollOperation(
	getPayrollEarningRuleInternal,
);
export const createPayrollPayGroup = bindPayrollOperation(
	createPayrollPayGroupInternal,
);
export const updatePayrollPayGroup = bindPayrollOperation(
	updatePayrollPayGroupInternal,
);
export const archivePayrollPayGroup = bindPayrollOperation(
	archivePayrollPayGroupInternal,
);
export const getPayrollPayGroup = bindPayrollOperation(
	getPayrollPayGroupInternal,
);
export const listPayrollPayGroups = bindPayrollOperation(
	listPayrollPayGroupsInternal,
);
export const createPayrollStatutoryRule = bindPayrollOperation(
	createPayrollStatutoryRuleInternal,
);
export const updatePayrollStatutoryRule = bindPayrollOperation(
	updatePayrollStatutoryRuleInternal,
);
export const archivePayrollStatutoryRule = bindPayrollOperation(
	archivePayrollStatutoryRuleInternal,
);
export const supersedePayrollStatutoryRule = bindPayrollOperation(
	supersedePayrollStatutoryRuleInternal,
);
export const getPayrollStatutoryRule = bindPayrollOperation(
	getPayrollStatutoryRuleInternal,
);
