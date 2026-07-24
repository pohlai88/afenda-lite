import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	PAYROLL_ERROR_PERSISTENCE_FAILURE,
	payrollErrorDetails,
} from "./error-codes";

export const payrollCalendarIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollCalendarId">();
export type PayrollCalendarId = z.infer<typeof payrollCalendarIdSchema>;

export const payrollPayGroupIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollPayGroupId">();
export type PayrollPayGroupId = z.infer<typeof payrollPayGroupIdSchema>;

export const payrollPeriodIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollPeriodId">();
export type PayrollPeriodId = z.infer<typeof payrollPeriodIdSchema>;

export const payrollEarningRuleIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollEarningRuleId">();
export type PayrollEarningRuleId = z.infer<typeof payrollEarningRuleIdSchema>;

export const payrollDeductionRuleIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollDeductionRuleId">();
export type PayrollDeductionRuleId = z.infer<
	typeof payrollDeductionRuleIdSchema
>;

export const payrollStatutoryRuleIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollStatutoryRuleId">();
export type PayrollStatutoryRuleId = z.infer<
	typeof payrollStatutoryRuleIdSchema
>;

export const payrollRunIdSchema = z.string().uuid().brand<"PayrollRunId">();
export type PayrollRunId = z.infer<typeof payrollRunIdSchema>;

export const payrollExceptionIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollExceptionId">();
export type PayrollExceptionId = z.infer<typeof payrollExceptionIdSchema>;

export const payrollEmployeeAssignmentIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollEmployeeAssignmentId">();
export type PayrollEmployeeAssignmentId = z.infer<
	typeof payrollEmployeeAssignmentIdSchema
>;

export const payrollRecurringEarningIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollRecurringEarningId">();
export type PayrollRecurringEarningId = z.infer<
	typeof payrollRecurringEarningIdSchema
>;

export const payrollRecurringDeductionIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollRecurringDeductionId">();
export type PayrollRecurringDeductionId = z.infer<
	typeof payrollRecurringDeductionIdSchema
>;

export const payrollVariableInputIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollVariableInputId">();
export type PayrollVariableInputId = z.infer<
	typeof payrollVariableInputIdSchema
>;

export const payrollRunEmployeeIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollRunEmployeeId">();
export type PayrollRunEmployeeId = z.infer<typeof payrollRunEmployeeIdSchema>;

export const payrollResultLineIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollResultLineId">();
export type PayrollResultLineId = z.infer<typeof payrollResultLineIdSchema>;

export const payrollStatutoryResultIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollStatutoryResultId">();
export type PayrollStatutoryResultId = z.infer<
	typeof payrollStatutoryResultIdSchema
>;

/** Brand after UUID generation or trusted DB load — never cast without parse. */
export function parsePayrollCalendarId(id: string): Result<PayrollCalendarId> {
	const parsed = payrollCalendarIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll calendar identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollPayGroupId(id: string): Result<PayrollPayGroupId> {
	const parsed = payrollPayGroupIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll pay group identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollPeriodId(id: string): Result<PayrollPeriodId> {
	const parsed = payrollPeriodIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll period identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollEarningRuleId(
	id: string,
): Result<PayrollEarningRuleId> {
	const parsed = payrollEarningRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll earning rule identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollDeductionRuleId(
	id: string,
): Result<PayrollDeductionRuleId> {
	const parsed = payrollDeductionRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll deduction rule identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollStatutoryRuleId(
	id: string,
): Result<PayrollStatutoryRuleId> {
	const parsed = payrollStatutoryRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll statutory rule identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollRunId(id: string): Result<PayrollRunId> {
	const parsed = payrollRunIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll run identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollExceptionId(
	id: string,
): Result<PayrollExceptionId> {
	const parsed = payrollExceptionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll exception identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollEmployeeAssignmentId(
	id: string,
): Result<PayrollEmployeeAssignmentId> {
	const parsed = payrollEmployeeAssignmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll employee assignment identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollRecurringEarningId(
	id: string,
): Result<PayrollRecurringEarningId> {
	const parsed = payrollRecurringEarningIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll recurring earning identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollRecurringDeductionId(
	id: string,
): Result<PayrollRecurringDeductionId> {
	const parsed = payrollRecurringDeductionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll recurring deduction identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollVariableInputId(
	id: string,
): Result<PayrollVariableInputId> {
	const parsed = payrollVariableInputIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll variable input identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollRunEmployeeId(
	id: string,
): Result<PayrollRunEmployeeId> {
	const parsed = payrollRunEmployeeIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll run employee identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollResultLineId(
	id: string,
): Result<PayrollResultLineId> {
	const parsed = payrollResultLineIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll result line identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parsePayrollStatutoryResultId(
	id: string,
): Result<PayrollStatutoryResultId> {
	const parsed = payrollStatutoryResultIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid payroll statutory result identifier",
			payrollErrorDetails(PAYROLL_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}
