import type { Result } from "@afenda/errors";
import type {
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { notFound } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST,
} from "../../kernel/operations/module-ids";
import {
	runCompensationCapabilityCommand,
	runCompensationCapabilityQuery,
} from "./run-operation";
import {
	archiveCompensationGradeProgressionRuleInputSchema,
	createCompensationGradeProgressionRuleInputSchema,
	getCompensationGradeProgressionRuleInputSchema,
	listCompensationGradeProgressionRulesFromGradeInputSchema,
	listEligibleProgressionTargetsInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE_PROGRESSION_RULE =
	"compensation_grade_progression_rule" as const;
export type HumanResourcesCompensationGradeProgressionRuleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE_PROGRESSION_RULE;

export function createCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["createCompensationGradeProgressionRule"],
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
					operationId:
						HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
				}),
			),
	});
}

export function archiveCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["archiveCompensationGradeProgressionRule"],
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
					operationId:
						HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
				}),
			),
	});
}

export function getCompensationGradeProgressionRule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["getCompensationGradeProgressionRule"],
		schema: getCompensationGradeProgressionRuleInputSchema,
		invalidMessage: "Invalid compensation grade progression rule get input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
		execute: async (
			data,
			{ store },
		): Promise<Result<CompensationGradeProgressionRule>> => {
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

export function listCompensationGradeProgressionRulesFromGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRuleListPage>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["listCompensationGradeProgressionRulesFromGrade"],
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

export function listEligibleProgressionTargets(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeProgressionRule[]>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["listEligibleProgressionTargets"],
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
