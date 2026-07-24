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

export type PayrollRuleFinalizedUsageInput = {
	organizationId: string;
	ruleKind: PayrollRuleKind;
	ruleId: PayrollRuleId;
	runId: PayrollRunId;
};

export type PayrollRuleFinalizedUsageCheck = {
	organizationId: string;
	ruleKind: PayrollRuleKind;
	ruleId: PayrollRuleId;
};

export function ruleFinalizedUsageKey(input: PayrollRuleFinalizedUsageCheck): string {
	return `${input.organizationId}:${input.ruleKind}:${input.ruleId}`;
}
