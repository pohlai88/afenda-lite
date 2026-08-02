import { errorResult, type Result } from "@afenda/errors";
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
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
} from "../types";
import {
	resolveActorTalentProfileResource,
	resolveTalentProfileResourceForEmployee,
	runTalentCapabilityCommand,
	runTalentCapabilityQuery,
} from "./run-operation";
import {
	projectTalentPoolMemberListFromDecision,
	talentSensitiveQueryRequestedFields,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_TALENT_POOL = "talent-pool" as const;
export type HumanResourcesTalentPoolAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TALENT_POOL;

export function createTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: ["createTalentPool", "findTalentPoolByIdempotencyKey"],
		schema: createTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool create input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.pool);
			}

			return store.createTalentPool(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE,
				}),
			);
		},
	});
}

export function updateTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: ["updateTalentPool"],
		schema: updateTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool update input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		execute: async (data, { store, ports }) =>
			await store.updateTalentPool(
				{
					organizationId: data.organizationId,
					poolId: data.poolId,
					name: data.name,
					description: data.description,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE,
				}),
			),
	});
}

export function closeTalentPool(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPool>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: ["closeTalentPool"],
		schema: closeTalentPoolInputSchema,
		invalidMessage: "Invalid talent pool close input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		execute: async (data, { store, ports }) =>
			await store.closeTalentPool(
				{
					organizationId: data.organizationId,
					poolId: data.poolId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE,
				}),
			),
	});
}

export function nominateTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: [
			"findTalentPoolMemberByIdempotencyKey",
			"nominateTalentPoolMember",
		],
		schema: nominateTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member nomination input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
		resolveResource: async (data, opts) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
				},
				opts,
			),
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.member);
			}

			return store.nominateTalentPoolMember(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
				}),
			);
		},
	});
}

export function approveTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: ["approveTalentPoolMember"],
		schema: approveTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member approval input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		execute: async (data, { store, ports }) =>
			await store.approveTalentPoolMember(
				{
					organizationId: data.organizationId,
					memberId: data.memberId,
					approverUserId: data.approverUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
				}),
			),
	});
}

export function removeTalentPoolMember(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMember>> {
	return runTalentCapabilityCommand(input, options, {
		storeMethods: ["removeTalentPoolMember"],
		schema: removeTalentPoolMemberInputSchema,
		invalidMessage: "Invalid talent pool member removal input",
		command: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		execute: async (data, { store, ports }) =>
			await store.removeTalentPoolMember(
				{
					organizationId: data.organizationId,
					memberId: data.memberId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
				}),
			),
	});
}

export function listTalentPoolMembers(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TalentPoolMemberListPage>> {
	return runTalentCapabilityQuery(input, options, {
		storeMethods: ["listTalentPoolMembers"],
		schema: listTalentPoolMembersInputSchema,
		invalidMessage: "Invalid talent pool member list input",
		query: HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST,
		resolveResource: (data, opts) =>
			resolveActorTalentProfileResource(data, opts),
		resolveRequestedFields: () => talentSensitiveQueryRequestedFields(),
		project: (value: TalentPoolMemberListPage, projection) =>
			projectTalentPoolMemberListFromDecision(value, projection),
		execute: async (data, { store }) =>
			await store.listTalentPoolMembers({
				organizationId: data.organizationId,
				poolId: data.poolId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
