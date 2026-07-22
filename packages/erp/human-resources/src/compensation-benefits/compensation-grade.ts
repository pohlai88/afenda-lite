import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
} from "../module-ids";
import {
	archiveCompensationGradeInputSchema,
	createCompensationGradeInputSchema,
	updateCompensationGradeInputSchema,
} from "../schemas";
import { runCompensationCommand } from "../shared/compensation-command";
import type { CompensationGrade } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE =
	"compensation_grade" as const;
export type HumanResourcesCompensationGradeAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_GRADE;

export async function createCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCommand(input, options, {
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function updateCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCommand(input, options, {
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function archiveCompensationGrade(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationGrade>> {
	return runCompensationCommand(input, options, {
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
				{ correlationId: data.correlationId },
			),
	});
}
