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
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	amendEmploymentInputSchema,
	createEmploymentInputSchema,
	getEmploymentInputSchema,
} from "../schemas";
import { assertEmploymentStatusTransition } from "../shared/employment-status";
import type { Employment } from "../types";

export async function createEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	const parsed = parseHumanResourcesInput(
		createEmploymentInputSchema,
		input,
		"Invalid employment create input",
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
			command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.createEmployment(
		{
			organizationId: parsed.data.organizationId,
			employeeId: parsed.data.employeeId,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function amendEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	const parsed = parseHumanResourcesInput(
		amendEmploymentInputSchema,
		input,
		"Invalid employment amend input",
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
			command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const existing = await store.getEmploymentById({
		organizationId: parsed.data.organizationId,
		employmentId: parsed.data.employmentId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return fail(
			"NOT_FOUND",
			"Employment not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}

	if (parsed.data.status !== undefined) {
		const transitionCheck = assertEmploymentStatusTransition(
			existing.data.status,
			parsed.data.status,
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}
	}

	return store.amendEmployment(
		{
			organizationId: parsed.data.organizationId,
			employmentId: parsed.data.employmentId,
			status: parsed.data.status,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	const parsed = parseHumanResourcesInput(
		getEmploymentInputSchema,
		input,
		"Invalid employment get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	});
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
	return ok(employment.data);
}
