import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST,
} from "../module-ids";
import {
	archiveCompensationGradeProgressionRuleInputSchema,
	createCompensationGradeProgressionRuleInputSchema,
	getCompensationGradeProgressionRuleInputSchema,
	listCompensationGradeProgressionRulesFromGradeInputSchema,
	listEligibleProgressionTargetsInputSchema,
} from "../schemas/compensation";
import {
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { notFound } from "../shared/domain-guards";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE_PROGRESSION_RULE =
	"compensation_grade_progression_rule" as const;
export type HumanResourcesCompensationGradeProgressionRuleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE_PROGRESSION_RULE;

export async function createCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationCommand(input, options, {
		schema: createCompensationGradeProgressionRuleInputSchema,
		invalidMessage: "Invalid compensation grade progression rule create input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
		execute: (data, { store, ports }) =>
			store.createCompensationGradeProgressionRule(
				{
					organizationId: data.organizationId,
					fromGradeId: data.fromGradeId,
					toGradeId: data.toGradeId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					minMonthsInGrade: data.minMonthsInGrade ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation:
						HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
				}),
			),
	});
}

export async function archiveCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationCommand(input, options, {
		schema: archiveCompensationGradeProgressionRuleInputSchema,
		invalidMessage: "Invalid compensation grade progression rule archive input",
		command:
			HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
		execute: (data, { store, ports }) =>
			store.archiveCompensationGradeProgressionRule(
				{
					organizationId: data.organizationId,
					progressionRuleId: data.progressionRuleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation:
						HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
				}),
			),
	});
}

export async function getCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationQuery(input, options, {
		schema: getCompensationGradeProgressionRuleInputSchema,
		invalidMessage: "Invalid compensation grade progression rule get input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
		execute: async (data, { store }) => {
			const rule = await store.getCompensationGradeProgressionRule({
				organizationId: data.organizationId,
				progressionRuleId: data.progressionRuleId,
			});
			if (!rule.ok) {
				return rule;
			}
			if (rule.data === null) {
				return notFound("Compensation grade progression rule not found");
			}
			return { ok: true, data: rule.data };
		},
	});
}

export async function listCompensationGradeProgressionRulesFromGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRuleListPage>> {
	return runCompensationQuery(input, options, {
		schema: listCompensationGradeProgressionRulesFromGradeInputSchema,
		invalidMessage: "Invalid compensation grade progression rule list input",
		query:
			HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE,
		execute: (data, { store }) =>
			store.listCompensationGradeProgressionRulesFromGrade({
				organizationId: data.organizationId,
				fromGradeId: data.fromGradeId,
				page: data.page,
				pageSize: data.pageSize,
				asOf: data.asOf,
			}),
	});
}

export async function listEligibleProgressionTargets(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule[]>> {
	return runCompensationQuery(input, options, {
		schema: listEligibleProgressionTargetsInputSchema,
		invalidMessage: "Invalid eligible progression targets input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST,
		execute: (data, { store }) =>
			store.listEligibleProgressionTargets({
				organizationId: data.organizationId,
				fromGradeId: data.fromGradeId,
				asOf: data.asOf,
			}),
	});
}
