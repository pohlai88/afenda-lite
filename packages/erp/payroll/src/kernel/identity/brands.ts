import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

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

export const payrollPayslipIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollPayslipId">();
export type PayrollPayslipId = z.infer<typeof payrollPayslipIdSchema>;

export const payrollReconciliationIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollReconciliationId">();
export type PayrollReconciliationId = z.infer<
	typeof payrollReconciliationIdSchema
>;

export const payrollAdjustmentIdSchema = z
	.string()
	.uuid()
	.brand<"PayrollAdjustmentId">();
export type PayrollAdjustmentId = z.infer<typeof payrollAdjustmentIdSchema>;

/** Brand after UUID generation or trusted DB load — never cast without parse. */
export function parsePayrollCalendarId(id: string): Result<PayrollCalendarId> {
	const parsed = payrollCalendarIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollPayGroupId(id: string): Result<PayrollPayGroupId> {
	const parsed = payrollPayGroupIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollPeriodId(id: string): Result<PayrollPeriodId> {
	const parsed = payrollPeriodIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollEarningRuleId(
	id: string,
): Result<PayrollEarningRuleId> {
	const parsed = payrollEarningRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollDeductionRuleId(
	id: string,
): Result<PayrollDeductionRuleId> {
	const parsed = payrollDeductionRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollStatutoryRuleId(
	id: string,
): Result<PayrollStatutoryRuleId> {
	const parsed = payrollStatutoryRuleIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollRunId(id: string): Result<PayrollRunId> {
	const parsed = payrollRunIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollExceptionId(
	id: string,
): Result<PayrollExceptionId> {
	const parsed = payrollExceptionIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollEmployeeAssignmentId(
	id: string,
): Result<PayrollEmployeeAssignmentId> {
	const parsed = payrollEmployeeAssignmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollRecurringEarningId(
	id: string,
): Result<PayrollRecurringEarningId> {
	const parsed = payrollRecurringEarningIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollRecurringDeductionId(
	id: string,
): Result<PayrollRecurringDeductionId> {
	const parsed = payrollRecurringDeductionIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollVariableInputId(
	id: string,
): Result<PayrollVariableInputId> {
	const parsed = payrollVariableInputIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollRunEmployeeId(
	id: string,
): Result<PayrollRunEmployeeId> {
	const parsed = payrollRunEmployeeIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollResultLineId(
	id: string,
): Result<PayrollResultLineId> {
	const parsed = payrollResultLineIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollStatutoryResultId(
	id: string,
): Result<PayrollStatutoryResultId> {
	const parsed = payrollStatutoryResultIdSchema.safeParse(id);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(parsed.data);
}

export function parsePayrollPayslipId(id: string): Result<PayrollPayslipId> {
	const parsed = payrollPayslipIdSchema.safeParse(id);
	return parsed.success
		? errorResult.ok(parsed.data)
		: errorResult.fail("INTERNAL_ERROR");
}

export function parsePayrollReconciliationId(
	id: string,
): Result<PayrollReconciliationId> {
	const parsed = payrollReconciliationIdSchema.safeParse(id);
	return parsed.success
		? errorResult.ok(parsed.data)
		: errorResult.fail("INTERNAL_ERROR");
}

export function parsePayrollAdjustmentId(
	id: string,
): Result<PayrollAdjustmentId> {
	const parsed = payrollAdjustmentIdSchema.safeParse(id);
	return parsed.success
		? errorResult.ok(parsed.data)
		: errorResult.fail("INTERNAL_ERROR");
}
