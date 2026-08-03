import type { PayrollReversalReasonCode } from "@afenda/events/schemas";
import type { z } from "zod";
import type {
	payrollResultLineCreateRecordSchema,
	payrollResultLineKindSchema,
	payrollResultLineRecordSchema,
	payrollResultLineRuleKindSchema,
	payrollRunEmployeeCreateRecordSchema,
	payrollRunEmployeeRecordSchema,
	payrollRunEmployeeStatusSchema,
	replaceRunCalculationOutputsInputSchema,
} from "../../features/calculation/outputs.schema";
import type {
	payrollEmployeeAssignmentCreateRecordSchema,
	payrollEmployeeAssignmentRecordSchema,
	payrollEmployeeAssignmentStatusSchema,
	payrollRecurringDeductionCreateRecordSchema,
	payrollRecurringDeductionRecordSchema,
	payrollRecurringEarningCreateRecordSchema,
	payrollRecurringEarningRecordSchema,
	payrollRecurringLineStatusSchema,
} from "../../features/employee-assignments/assignments.schema";
import type {
	payrollExceptionCreateRecordSchema,
	payrollExceptionRecordSchema,
	payrollExceptionSeveritySchema,
	payrollRoundingPolicySchema,
	payrollRunCreateRecordSchema,
	payrollRunRecordSchema,
	payrollRunStatusSchema,
	payrollRunTypeSchema,
	payrollRunUpdateInputSchema,
} from "../../features/payroll-runs/runs.schema";
import type {
	payrollCalendarArchiveInputSchema,
	payrollCalendarCreateRecordSchema,
	payrollCalendarRecordSchema,
	payrollCalendarStatusSchema,
	payrollCalendarUpdateInputSchema,
	payrollDeductionRuleArchiveInputSchema,
	payrollDeductionRuleCreateRecordSchema,
	payrollDeductionRuleRecordSchema,
	payrollDeductionRuleSupersedeRecordSchema,
	payrollDeductionRuleUpdateInputSchema,
	payrollDeductionTaxTimingSchema,
	payrollEarningRuleArchiveInputSchema,
	payrollEarningRuleCreateRecordSchema,
	payrollEarningRuleRecordSchema,
	payrollEarningRuleSupersedeRecordSchema,
	payrollEarningRuleUpdateInputSchema,
	payrollPayGroupArchiveInputSchema,
	payrollPayGroupCreateRecordSchema,
	payrollPayGroupRecordSchema,
	payrollPayGroupUpdateInputSchema,
	payrollPeriodCloseInputSchema,
	payrollPeriodCreateRecordSchema,
	payrollPeriodRecordSchema,
	payrollPeriodStatusSchema,
	payrollPeriodUpdateInputSchema,
	payrollRuleStatusSchema,
	payrollRuleTypeSchema,
	payrollStatutoryRuleArchiveInputSchema,
	payrollStatutoryRuleCreateRecordSchema,
	payrollStatutoryRuleRecordSchema,
	payrollStatutoryRuleSupersedeRecordSchema,
	payrollStatutoryRuleUpdateInputSchema,
} from "../../features/payroll-setup/setup.schema";
import type {
	payrollReconciliationCreateRecordSchema,
	payrollReconciliationRecordSchema,
} from "../../features/reconciliation/reconciliation.schema";
import type {
	payrollStatutoryResultCreateRecordSchema,
	payrollStatutoryResultRecordSchema,
	replaceStatutoryResultsForRunInputSchema,
} from "../../features/statutory-rules/statutory.schema";
import type {
	idempotentPayrollVariableInputRecordSchema,
	payrollVariableInputCreateRecordSchema,
	payrollVariableInputRecordSchema,
	payrollVariableInputStatusSchema,
} from "../../features/variable-inputs/inputs.schema";
import type {
	PayrollAdjustmentId,
	PayrollRunEmployeeId,
	PayrollRunId,
} from "../identity/brands";

export type {
	PayrollMutationContext,
	PayrollTenantContext,
} from "../validation/common.schema";

export type PayrollCalendarStatus = z.infer<typeof payrollCalendarStatusSchema>;
export type PayrollPeriodStatus = z.infer<typeof payrollPeriodStatusSchema>;
export type PayrollRuleType = z.infer<typeof payrollRuleTypeSchema>;
export type PayrollRuleStatus = z.infer<typeof payrollRuleStatusSchema>;
export type PayrollDeductionTaxTiming = z.infer<
	typeof payrollDeductionTaxTimingSchema
>;
export type PayrollRunEmployeeStatus = z.infer<
	typeof payrollRunEmployeeStatusSchema
>;
export type PayrollRoundingPolicy = z.infer<typeof payrollRoundingPolicySchema>;
export type PayrollResultLineKind = z.infer<typeof payrollResultLineKindSchema>;
export type PayrollResultLineRuleKind = z.infer<
	typeof payrollResultLineRuleKindSchema
>;

export type PayrollCalendar = z.infer<typeof payrollCalendarRecordSchema>;
export type PayrollPayGroup = z.infer<typeof payrollPayGroupRecordSchema>;
export type PayrollPeriod = z.infer<typeof payrollPeriodRecordSchema>;
export type PayrollEarningRule = z.infer<typeof payrollEarningRuleRecordSchema>;
export type PayrollDeductionRule = z.infer<
	typeof payrollDeductionRuleRecordSchema
>;
export type PayrollStatutoryRule = z.infer<
	typeof payrollStatutoryRuleRecordSchema
>;

export type PayrollCalendarCreateRecord = z.infer<
	typeof payrollCalendarCreateRecordSchema
>;
export type PayrollPayGroupCreateRecord = z.infer<
	typeof payrollPayGroupCreateRecordSchema
>;
export type PayrollPeriodCreateRecord = z.infer<
	typeof payrollPeriodCreateRecordSchema
>;
export type PayrollEarningRuleCreateRecord = z.infer<
	typeof payrollEarningRuleCreateRecordSchema
>;
export type PayrollDeductionRuleCreateRecord = z.infer<
	typeof payrollDeductionRuleCreateRecordSchema
>;
export type PayrollStatutoryRuleCreateRecord = z.infer<
	typeof payrollStatutoryRuleCreateRecordSchema
>;
export type PayrollCalendarUpdateInput = z.infer<
	typeof payrollCalendarUpdateInputSchema
>;
export type PayrollCalendarArchiveInput = z.infer<
	typeof payrollCalendarArchiveInputSchema
>;
export type PayrollPayGroupUpdateInput = z.infer<
	typeof payrollPayGroupUpdateInputSchema
>;
export type PayrollPayGroupArchiveInput = z.infer<
	typeof payrollPayGroupArchiveInputSchema
>;
export type PayrollPeriodUpdateInput = z.infer<
	typeof payrollPeriodUpdateInputSchema
>;
export type PayrollPeriodCloseInput = z.infer<
	typeof payrollPeriodCloseInputSchema
>;
export type PayrollEarningRuleUpdateInput = z.infer<
	typeof payrollEarningRuleUpdateInputSchema
>;
export type PayrollEarningRuleArchiveInput = z.infer<
	typeof payrollEarningRuleArchiveInputSchema
>;
export type PayrollEarningRuleSupersedeRecord = z.infer<
	typeof payrollEarningRuleSupersedeRecordSchema
>;
export type PayrollDeductionRuleUpdateInput = z.infer<
	typeof payrollDeductionRuleUpdateInputSchema
>;
export type PayrollDeductionRuleArchiveInput = z.infer<
	typeof payrollDeductionRuleArchiveInputSchema
>;
export type PayrollDeductionRuleSupersedeRecord = z.infer<
	typeof payrollDeductionRuleSupersedeRecordSchema
>;
export type PayrollStatutoryRuleUpdateInput = z.infer<
	typeof payrollStatutoryRuleUpdateInputSchema
>;
export type PayrollStatutoryRuleArchiveInput = z.infer<
	typeof payrollStatutoryRuleArchiveInputSchema
>;
export type PayrollStatutoryRuleSupersedeRecord = z.infer<
	typeof payrollStatutoryRuleSupersedeRecordSchema
>;

export interface PayrollRuleSupersedeResult<TRule> {
	successor: TRule;
	superseded: TRule;
}

export interface IdempotentPayrollPayGroupRecord {
	createRequestFingerprint: string;
	payGroup: PayrollPayGroup;
}

export interface IdempotentPayrollPeriodRecord {
	createRequestFingerprint: string;
	period: PayrollPeriod;
}

export type PayrollRunType = z.infer<typeof payrollRunTypeSchema>;
export type PayrollRunStatus = z.infer<typeof payrollRunStatusSchema>;
export type PayrollExceptionSeverity = z.infer<
	typeof payrollExceptionSeveritySchema
>;
export type PayrollRun = z.infer<typeof payrollRunRecordSchema>;
export type PayrollException = z.infer<typeof payrollExceptionRecordSchema>;
export type PayrollRunCreateRecord = z.infer<
	typeof payrollRunCreateRecordSchema
>;
export interface PayrollFinalizationProjection {
	paymentDate: string;
	payments: Array<{
		employeeId: string;
		sourceId: string;
		amount: string;
		currencyCode: string;
	}>;
	postingDate: string;
	postingLines: Array<{
		sourceId: string;
		employeeId: string;
		category: PayrollResultLine["lineKind"];
		amount: string;
		currencyCode: string;
		dimensions: Record<string, string>;
	}>;
	totals: Array<{
		currencyCode: string;
		gross: string;
		employeeDeductions: string;
		employeeStatutory: string;
		employerCost: string;
		net: string;
	}>;
}

export interface PayrollReversalProjection
	extends PayrollFinalizationProjection {
	reason: string;
	reasonCode: PayrollReversalReasonCode;
}

export type PayrollRunUpdateInput = z.infer<
	typeof payrollRunUpdateInputSchema
> & {
	finalizationProjection?: PayrollFinalizationProjection | undefined;
	reversalProjection?: PayrollReversalProjection | undefined;
};
export type PayrollExceptionCreateRecord = z.infer<
	typeof payrollExceptionCreateRecordSchema
>;

export interface IdempotentPayrollCalendarRecord {
	calendar: PayrollCalendar;
	createRequestFingerprint: string;
}

export interface IdempotentPayrollRunRecord {
	createRequestFingerprint: string;
	run: PayrollRun;
}

export type PayrollEmployeeAssignmentStatus = z.infer<
	typeof payrollEmployeeAssignmentStatusSchema
>;
export type PayrollRecurringLineStatus = z.infer<
	typeof payrollRecurringLineStatusSchema
>;
export type PayrollVariableInputStatus = z.infer<
	typeof payrollVariableInputStatusSchema
>;

export type PayrollEmployeeAssignment = z.infer<
	typeof payrollEmployeeAssignmentRecordSchema
>;
export type PayrollRecurringEarning = z.infer<
	typeof payrollRecurringEarningRecordSchema
>;
export type PayrollRecurringDeduction = z.infer<
	typeof payrollRecurringDeductionRecordSchema
>;
export type PayrollVariableInput = z.infer<
	typeof payrollVariableInputRecordSchema
>;

export type PayrollEmployeeAssignmentCreateRecord = z.infer<
	typeof payrollEmployeeAssignmentCreateRecordSchema
>;
export type PayrollRecurringEarningCreateRecord = z.infer<
	typeof payrollRecurringEarningCreateRecordSchema
>;
export type PayrollRecurringDeductionCreateRecord = z.infer<
	typeof payrollRecurringDeductionCreateRecordSchema
>;
export type PayrollVariableInputCreateRecord = z.infer<
	typeof payrollVariableInputCreateRecordSchema
>;

export type IdempotentPayrollVariableInputRecord = z.infer<
	typeof idempotentPayrollVariableInputRecordSchema
>;

export type PayrollRunEmployee = z.infer<typeof payrollRunEmployeeRecordSchema>;
export type PayrollResultLine = z.infer<typeof payrollResultLineRecordSchema>;
export type PayrollStatutoryResult = z.infer<
	typeof payrollStatutoryResultRecordSchema
>;

export type PayrollRunEmployeeCreateRecord = z.infer<
	typeof payrollRunEmployeeCreateRecordSchema
>;
export type PayrollResultLineCreateRecord = z.infer<
	typeof payrollResultLineCreateRecordSchema
>;
export type ReplaceRunCalculationOutputsInput = z.infer<
	typeof replaceRunCalculationOutputsInputSchema
>;
export type PayrollStatutoryResultCreateRecord = z.infer<
	typeof payrollStatutoryResultCreateRecordSchema
>;
export type ReplaceStatutoryResultsForRunInput = z.infer<
	typeof replaceStatutoryResultsForRunInputSchema
>;

export type PayrollReconciliation = z.infer<
	typeof payrollReconciliationRecordSchema
>;
export type PayrollReconciliationCreateRecord = z.infer<
	typeof payrollReconciliationCreateRecordSchema
>;

export const PAYROLL_PAYSLIP_CONTRACT_VERSION = "payroll.payslip.v1" as const;

export interface PayrollPayslipViewModel {
	contentHash: string;
	contractVersion: typeof PAYROLL_PAYSLIP_CONTRACT_VERSION;
	currencyCode: string;
	employeeDeductions: string;
	employeeId: string;
	employeeStatutory: string;
	employerCost: string;
	gross: string;
	lines: Array<{
		sequence: number;
		category: PayrollResultLine["lineKind"];
		code: string;
		amount: string;
		currencyCode: string;
	}>;
	net: string;
	organizationId: string;
	runId: PayrollRunId;
	status: "finalized" | "reversed";
}

export interface PayrollAdjustment {
	adjustmentType: "reversal" | "adjustment";
	amount: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	id: PayrollAdjustmentId;
	organizationId: string;
	originalRunEmployeeId: PayrollRunEmployeeId | null;
	originalRunId: PayrollRunId;
	reason: string;
	reversalRunId: PayrollRunId | null;
}

/** Immutable accepted workforce handoff — the canonical Payroll ingress record. */
export interface AcceptedPayrollHandoff {
	acceptedAt: Date;
	acceptedBy: string;
	contractVersion: string;
	effectiveDate: string;
	employeeId: string;
	employmentId: string;
	id: string;
	organizationId: string;
	/** Raw HR payload sealed at acceptance; Payroll re-parses on read. */
	payload: unknown;
	payloadHash: string;
	periodEnd: string | null;
	periodStart: string | null;
	status: "accepted" | "superseded";
	supersededByHandoffId: string | null;
	version: number;
}
