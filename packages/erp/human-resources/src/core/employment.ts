import { fail, ok, type Result } from "@afenda/errors/result";
import { buildMutationMeta } from "../shared/mutation-meta";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
} from "../module-ids";
import {
	amendEmploymentInputSchema,
	createEmploymentInputSchema,
	getEmploymentInputSchema,
} from "../schemas/core";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { resolveAmendEndsOn } from "../shared/domain-guards";
import { assertEmploymentStatusTransition } from "../shared/employment-status";
import type { Employment } from "../types";

export async function createEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreCommand(input, options, {
		schema: createEmploymentInputSchema,
		invalidMessage: "Invalid employment create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		execute: async (data, { store, ports }) => {
			return store.createEmployment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({ correlationId: data.correlationId, operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE }),
			);
		},
	});
}

export async function amendEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreCommand(input, options, {
		schema: amendEmploymentInputSchema,
		invalidMessage: "Invalid employment amend input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
		execute: async (data, { store, ports }) => {
			const existing = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
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

			if (data.status !== undefined) {
				const transitionCheck = assertEmploymentStatusTransition(
					existing.data.status,
					data.status,
				);
				if (!transitionCheck.ok) {
					return transitionCheck;
				}
			}

			const startsOn = data.startsOn ?? existing.data.startsOn;
			const endsOnResolved = resolveAmendEndsOn({
				nextStatus: data.status,
				startsOn,
				endsOn: data.endsOn,
				previousEndsOn: existing.data.endsOn,
			});
			if (!endsOnResolved.ok) {
				return endsOnResolved;
			}

			return store.amendEmployment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					status: data.status,
					startsOn: data.startsOn,
					endsOn: endsOnResolved.data,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({ correlationId: data.correlationId, operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND }),
			);
		},
	});
}

export async function getEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentInputSchema,
		invalidMessage: "Invalid employment get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
		execute: async (data, { store }) => {
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
			return ok(employment.data);
		},
	});
}
