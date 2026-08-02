import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import {
	type PayrollDeductionRuleId,
	type PayrollEarningRuleId,
	type PayrollRunId,
	type PayrollStatutoryRuleId,
	payrollDeductionRuleIdSchema,
	payrollEarningRuleIdSchema,
	payrollStatutoryRuleIdSchema,
} from "../../kernel/identity/brands";
import type { PayrollRuleFinalizedUsageInput } from "./rule-finalized-lock";

export type FinalizedRuleUsage =
	| (PayrollRuleFinalizedUsageInput & {
			recordVersion: number;
			ruleId: PayrollEarningRuleId;
			ruleKind: "earning";
	  })
	| (PayrollRuleFinalizedUsageInput & {
			recordVersion: number;
			ruleId: PayrollDeductionRuleId;
			ruleKind: "deduction";
	  })
	| (PayrollRuleFinalizedUsageInput & {
			recordVersion: number;
			ruleId: PayrollStatutoryRuleId;
			ruleKind: "statutory";
	  });

const finalizedRuleUsageSnapshotSchema = z
	.object({
		earningRules: z.array(
			z.object({
				id: payrollEarningRuleIdSchema,
				recordVersion: z.number().int().positive(),
			}),
		),
		deductionRules: z.array(
			z.object({
				id: payrollDeductionRuleIdSchema,
				recordVersion: z.number().int().positive(),
			}),
		),
		statutoryRules: z.array(
			z.object({
				id: payrollStatutoryRuleIdSchema,
				recordVersion: z.number().int().positive(),
			}),
		),
	})
	.passthrough();

export function collectFinalizedRuleUsage(input: {
	organizationId: string;
	runId: PayrollRunId;
	snapshots: readonly unknown[];
}): Result<FinalizedRuleUsage[]> {
	const usage = new Map<string, FinalizedRuleUsage>();
	for (const snapshot of input.snapshots) {
		const parsed = finalizedRuleUsageSnapshotSchema.safeParse(snapshot);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		for (const rule of parsed.data.earningRules) {
			usage.set(`earning:${rule.id}`, {
				organizationId: input.organizationId,
				ruleKind: "earning",
				ruleId: rule.id,
				recordVersion: rule.recordVersion,
				runId: input.runId,
			});
		}
		for (const rule of parsed.data.deductionRules) {
			usage.set(`deduction:${rule.id}`, {
				organizationId: input.organizationId,
				ruleKind: "deduction",
				ruleId: rule.id,
				recordVersion: rule.recordVersion,
				runId: input.runId,
			});
		}
		for (const rule of parsed.data.statutoryRules) {
			usage.set(`statutory:${rule.id}`, {
				organizationId: input.organizationId,
				ruleKind: "statutory",
				ruleId: rule.id,
				recordVersion: rule.recordVersion,
				runId: input.runId,
			});
		}
	}
	return errorResult.ok([...usage.values()]);
}
