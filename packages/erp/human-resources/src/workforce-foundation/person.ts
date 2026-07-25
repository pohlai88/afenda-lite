import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
	HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
	HUMAN_RESOURCES_QUERY_PERSON_AS_OF,
	HUMAN_RESOURCES_QUERY_PERSON_GET,
} from "../module-ids";
import {
	createPersonInputSchema,
	getPersonAsOfInputSchema,
	getPersonInputSchema,
	updatePersonNameInputSchema,
} from "../schemas/workforce-foundation";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { fingerprintPersonCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	Person,
	PersonIdentityAtAsOf,
} from "../workforce-foundation/types";

export async function createPerson(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Person>> {
	return runCoreCommand(input, options, {
		schema: createPersonInputSchema,
		invalidMessage: "Invalid person create input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPersonCreate({
				legalName: data.legalName,
			});

			const existingByKey = await store.findPersonByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.person);
			}

			return store.createPerson(
				{
					organizationId: data.organizationId,
					legalName: data.legalName.trim(),
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
				}),
			);
		},
	});
}

export async function updatePersonName(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Person>> {
	return runCoreCommand(input, options, {
		schema: updatePersonNameInputSchema,
		invalidMessage: "Invalid person update input",
		command: HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
		execute: async (data, { store, ports }) => {
			return store.updatePersonName(
				{
					organizationId: data.organizationId,
					personId: data.personId,
					legalName: data.legalName.trim(),
					effectiveOn: data.effectiveOn,
					reasonCode: data.reasonCode,
					evidenceRef: data.evidenceRef ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
				}),
			);
		},
	});
}

export async function getPersonById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Person>> {
	return runCoreQuery(input, options, {
		schema: getPersonInputSchema,
		invalidMessage: "Invalid person get input",
		query: HUMAN_RESOURCES_QUERY_PERSON_GET,
		execute: async (data, { store }) => {
			const result = await store.getPersonById({
				organizationId: data.organizationId,
				personId: data.personId,
			});
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return fail("NOT_FOUND", "Person not found");
			}
			return ok(result.data);
		},
	});
}

export async function getPersonAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PersonIdentityAtAsOf>> {
	return runCoreQuery(input, options, {
		schema: getPersonAsOfInputSchema,
		invalidMessage: "Invalid person as-of input",
		query: HUMAN_RESOURCES_QUERY_PERSON_AS_OF,
		execute: async (data, { store }) => {
			const result = await store.findPersonAsOf({
				organizationId: data.organizationId,
				personId: data.personId,
				asOf: data.asOf,
			});
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return fail("NOT_FOUND", "Person identity not found for as-of date");
			}
			return ok(result.data);
		},
	});
}
