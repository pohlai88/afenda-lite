import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
	HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST,
} from "../module-ids";
import {
	approveTalentPoolMemberInputSchema,
	closeTalentPoolInputSchema,
	createTalentPoolInputSchema,
	listTalentPoolMembersInputSchema,
	nominateTalentPoolMemberInputSchema,
	removeTalentPoolMemberInputSchema,
	updateTalentPoolInputSchema,
} from "../schemas/talent";
import {
	fingerprintTalentPoolCreate,
	fingerprintTalentPoolMemberCreate,
} from "../shared/fingerprint";
import { runTalentCommand, runTalentQuery } from "../shared/talent-command";
import type {
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_TALENT_POOL = "talent-pool" as const;
export type HumanResourcesTalentPoolAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TALENT_POOL;

export async function createTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCommand(input, options, {
		schema: createTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool create input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintTalentPoolCreate({
				code: data.code,
				name: data.name,
			});

			const existingByKey = await store.findTalentPoolByIdempotencyKey({
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
				return ok(existingByKey.data.pool);
			}

			return await store.createTalentPool(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					description: data.description ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCommand(input, options, {
		schema: updateTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool update input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
		execute: async (data, { store, ports }) => {
			return await store.updateTalentPool(
				{
					organizationId: data.organizationId,
					poolId: data.poolId,
					name: data.name,
					description: data.description,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function closeTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCommand(input, options, {
		schema: closeTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool close input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
		execute: async (data, { store, ports }) => {
			return await store.closeTalentPool(
				{
					organizationId: data.organizationId,
					poolId: data.poolId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function nominateTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCommand(input, options, {
		schema: nominateTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member nomination input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintTalentPoolMemberCreate({
				poolId: data.poolId,
				employeeId: data.employeeId,
				nominatorUserId: data.nominatorUserId,
			});

			const existingByKey = await store.findTalentPoolMemberByIdempotencyKey({
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
				return ok(existingByKey.data.member);
			}

			return await store.nominateTalentPoolMember(
				{
					organizationId: data.organizationId,
					poolId: data.poolId,
					employeeId: data.employeeId,
					nominatorUserId: data.nominatorUserId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function approveTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCommand(input, options, {
		schema: approveTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member approval input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
		execute: async (data, { store, ports }) => {
			return await store.approveTalentPoolMember(
				{
					organizationId: data.organizationId,
					memberId: data.memberId,
					approverUserId: data.approverUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function removeTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCommand(input, options, {
		schema: removeTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member removal input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
		execute: async (data, { store, ports }) => {
			return await store.removeTalentPoolMember(
				{
					organizationId: data.organizationId,
					memberId: data.memberId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function listTalentPoolMembers(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMemberListPage>> {
	return runTalentQuery(input, options, {
		schema: listTalentPoolMembersInputSchema,
		invalidMessage: "Invalid talent pool member list input",
		query: HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST,
		execute: async (data, { store }) => {
			return await store.listTalentPoolMembers({
				organizationId: data.organizationId,
				poolId: data.poolId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			});
		},
	});
}
