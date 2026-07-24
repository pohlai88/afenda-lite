import type { z } from "zod";

import type {
	payrollCalendarCreateRecordSchema,
	payrollCalendarRecordSchema,
	payrollCalendarStatusSchema,
	payrollCalendarUpdateInputSchema,
	payrollCalendarArchiveInputSchema,
	payrollPayGroupUpdateInputSchema,
	payrollPayGroupArchiveInputSchema,
	payrollPeriodUpdateInputSchema,
	payrollPeriodCloseInputSchema,
	payrollEarningRuleUpdateInputSchema,
	payrollEarningRuleArchiveInputSchema,
	payrollEarningRuleSupersedeRecordSchema,
	payrollDeductionRuleUpdateInputSchema,
	payrollDeductionRuleArchiveInputSchema,
	payrollDeductionRuleSupersedeRecordSchema,
	payrollStatutoryRuleUpdateInputSchema,
	payrollStatutoryRuleArchiveInputSchema,
	payrollStatutoryRuleSupersedeRecordSchema,
	payrollDeductionRuleCreateRecordSchema,
	payrollDeductionRuleRecordSchema,
	payrollDeductionTaxTimingSchema,
	payrollEarningRuleCreateRecordSchema,
	payrollEarningRuleRecordSchema,
	payrollPayGroupCreateRecordSchema,
	payrollPayGroupRecordSchema,
	payrollPeriodCreateRecordSchema,
	payrollPeriodRecordSchema,
	payrollPeriodStatusSchema,
	payrollRuleStatusSchema,
	payrollRuleTypeSchema,
	payrollStatutoryRuleCreateRecordSchema,
	payrollStatutoryRuleRecordSchema,
} from "./schemas/setup";
import type {
	payrollExceptionCreateRecordSchema,
	payrollExceptionRecordSchema,
	payrollExceptionSeveritySchema,
	payrollRunCreateRecordSchema,
	payrollRunRecordSchema,
	payrollRunStatusSchema,
	payrollRunTypeSchema,
	payrollRunUpdateInputSchema,
	payrollRoundingPolicySchema,
} from "./schemas/runs";
import type {
	payrollEmployeeAssignmentCreateRecordSchema,
	payrollEmployeeAssignmentRecordSchema,
	payrollEmployeeAssignmentStatusSchema,
	payrollRecurringDeductionCreateRecordSchema,
	payrollRecurringDeductionRecordSchema,
	payrollRecurringEarningCreateRecordSchema,
	payrollRecurringEarningRecordSchema,
	payrollRecurringLineStatusSchema,
} from "./schemas/assignments";
import type {
	idempotentPayrollVariableInputRecordSchema,
	payrollVariableInputCreateRecordSchema,
	payrollVariableInputRecordSchema,
	payrollVariableInputStatusSchema,
} from "./schemas/inputs";
import type {
	payrollResultLineCreateRecordSchema,
	payrollResultLineKindSchema,
	payrollResultLineRecordSchema,
	payrollResultLineRuleKindSchema,
	payrollRunEmployeeCreateRecordSchema,
	payrollRunEmployeeRecordSchema,
	payrollRunEmployeeStatusSchema,
	replaceRunCalculationOutputsInputSchema,
} from "./schemas/outputs";
import type {
	payrollStatutoryResultCreateRecordSchema,
	payrollStatutoryResultRecordSchema,
	replaceStatutoryResultsForRunInputSchema,
} from "./schemas/statutory";

export type {
	PayrollMutationContext,
	PayrollTenantContext,
} from "./schemas/common";

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

export type PayrollRuleSupersedeResult<TRule> = {
	superseded: TRule;
	successor: TRule;
};

export type IdempotentPayrollPayGroupRecord = {
	payGroup: PayrollPayGroup;
	createRequestFingerprint: string;
};

export type IdempotentPayrollPeriodRecord = {
	period: PayrollPeriod;
	createRequestFingerprint: string;
};

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
export type PayrollRunUpdateInput = z.infer<typeof payrollRunUpdateInputSchema>;
export type PayrollExceptionCreateRecord = z.infer<
	typeof payrollExceptionCreateRecordSchema
>;

export type IdempotentPayrollCalendarRecord = {
	calendar: PayrollCalendar;
	createRequestFingerprint: string;
};

export type IdempotentPayrollRunRecord = {
	run: PayrollRun;
	createRequestFingerprint: string;
};

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
