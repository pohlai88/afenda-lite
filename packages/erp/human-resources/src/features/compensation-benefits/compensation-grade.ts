import type { Result } from "@afenda/errors";
import type {
	CompensationGrade,
	CompensationGradeListPage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { notFound } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_LIST,
} from "../../kernel/operations/module-ids";
import {
	runCompensationCapabilityCommand,
	runCompensationCapabilityQuery,
} from "./run-operation";
import {
	archiveCompensationGradeInputSchema,
	createCompensationGradeInputSchema,
	getCompensationGradeInputSchema,
	listCompensationGradesInputSchema,
	updateCompensationGradeInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE =
	"compensation_grade" as const;
export type HumanResourcesCompensationGradeAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE;

export function createCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["createCompensationGrade"],
		schema: createCompensationGradeInputSchema,
		invalidMessage: "Invalid compensation grade create input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
		execute: (data, { store, ports }) =>
			store.createCompensationGrade(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
				}),
			),
	});
}

export function updateCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["updateCompensationGrade"],
		schema: updateCompensationGradeInputSchema,
		invalidMessage: "Invalid compensation grade update input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
		execute: (data, { store, ports }) =>
			store.updateCompensationGrade(
				{
					organizationId: data.organizationId,
					gradeId: data.gradeId,
					name: data.name,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
				}),
			),
	});
}

export function archiveCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCapabilityCommand(input, options, {
		storeMethods: ["archiveCompensationGrade"],
		schema: archiveCompensationGradeInputSchema,
		invalidMessage: "Invalid compensation grade archive input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
		execute: (data, { store, ports }) =>
			store.archiveCompensationGrade(
				{
					organizationId: data.organizationId,
					gradeId: data.gradeId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
				}),
			),
	});
}

export function getCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["getCompensationGrade"],
		schema: getCompensationGradeInputSchema,
		invalidMessage: "Invalid compensation grade get input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_GET,
		execute: async (data, { store }): Promise<Result<CompensationGrade>> => {
			const grade = await store.getCompensationGrade({
				organizationId: data.organizationId,
				gradeId: data.gradeId,
			});
			if (!grade.ok) {
				return grade;
			}
			if (grade.data === null) {
				return notFound("Compensation grade not found");
			}
			return { ok: true, data: grade.data };
		},
	});
}

export function listCompensationGrades(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGradeListPage>> {
	return runCompensationCapabilityQuery(input, options, {
		storeMethods: ["listCompensationGrades"],
		schema: listCompensationGradesInputSchema,
		invalidMessage: "Invalid compensation grade list input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_LIST,
		execute: (data, { store }) =>
			store.listCompensationGrades({
				organizationId: data.organizationId,
				page: data.page,
				pageSize: data.pageSize,
				status: data.status,
			}),
	});
}
