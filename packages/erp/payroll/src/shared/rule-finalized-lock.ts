import type {
	PayrollDeductionRuleId,
	PayrollEarningRuleId,
	PayrollRunId,
	PayrollStatutoryRuleId,
} from "../brands";

export type PayrollRuleKind = "earning" | "deduction" | "statutory";

export type PayrollRuleId =
	| PayrollEarningRuleId
	| PayrollDeductionRuleId
	| PayrollStatutoryRuleId;

export interface PayrollRuleFinalizedUsageInput {
	organizationId: string;
	ruleId: PayrollRuleId;
	ruleKind: PayrollRuleKind;
	runId: PayrollRunId;
}

export interface PayrollRuleFinalizedUsageCheck {
	organizationId: string;
	ruleId: PayrollRuleId;
	ruleKind: PayrollRuleKind;
}

export function ruleFinalizedUsageKey(
	input: PayrollRuleFinalizedUsageCheck,
): string {
	return `${input.organizationId}:${input.ruleKind}:${input.ruleId}`;
}
