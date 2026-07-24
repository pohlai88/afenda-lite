import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type HumanResourcesCommandOptions,
	requireOrganizationDimensionDirectory,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
} from "../module-ids";
import {
	createAssignmentInputSchema,
	endAssignmentInputSchema,
	getAssignmentInputSchema,
} from "../schemas/organization";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { WorkAssignment } from "../types";

export async function createAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runCoreCommand(input, options, {
		schema: createAssignmentInputSchema,
		invalidMessage: "Invalid assignment create input",
		command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
		execute: async (data, { store, ports }) => {
			const directory = requireOrganizationDimensionDirectory(options);
			if (!directory.ok) return directory;
			const dimensions = await directory.data.resolveRequiredAsOf({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: data.startsOn,
				keys: {
					legal_entity: data.legalEntityKey,
					business_unit: data.businessUnitKey,
					location: data.locationKey,
					cost_centre: data.costCentreKey,
					project: data.projectKey,
				},
			});
			if (!dimensions.ok) return dimensions;

			const employment = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			return store.createAssignment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					employeeId: employment.data.employeeId,
					positionId: data.positionId,
					organizationDimensions: dimensions.data,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
				}),
			);
		},
	});
}

export async function endAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runCoreCommand(input, options, {
		schema: endAssignmentInputSchema,
		invalidMessage: "Invalid assignment end input",
		command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
		execute: async (data, { store, ports }) => {
			return store.endAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
				}),
			);
		},
	});
}

export async function getAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	return runCoreQuery(input, options, {
		schema: getAssignmentInputSchema,
		invalidMessage: "Invalid assignment get input",
		query: HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
		execute: async (data, { store }) => {
			const assignment = await store.getAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return fail(
					"NOT_FOUND",
					"Assignment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(assignment.data);
		},
	});
}
