import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
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
import { parseHumanResourcesInput } from "../parse-input";
import {
	createAssignmentInputSchema,
	endAssignmentInputSchema,
	getAssignmentInputSchema,
} from "../schemas";
import type { WorkAssignment } from "../types";

export async function createAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	const parsed = parseHumanResourcesInput(
		createAssignmentInputSchema,
		input,
		"Invalid assignment create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const employment = await store.getEmploymentById({
		organizationId: parsed.data.organizationId,
		employmentId: parsed.data.employmentId,
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
			organizationId: parsed.data.organizationId,
			employmentId: parsed.data.employmentId,
			employeeId: employment.data.employeeId,
			positionId: parsed.data.positionId,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function endAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	const parsed = parseHumanResourcesInput(
		endAssignmentInputSchema,
		input,
		"Invalid assignment end input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.endAssignment({
		organizationId: parsed.data.organizationId,
		assignmentId: parsed.data.assignmentId,
		endsOn: parsed.data.endsOn,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function getAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment>> {
	const parsed = parseHumanResourcesInput(
		getAssignmentInputSchema,
		input,
		"Invalid assignment get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const assignment = await store.getAssignmentById({
		organizationId: parsed.data.organizationId,
		assignmentId: parsed.data.assignmentId,
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
}
