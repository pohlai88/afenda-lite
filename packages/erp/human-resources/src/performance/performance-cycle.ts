import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
} from "../module-ids";
import {
	addCycleParticipantInputSchema,
	createPerformanceCycleInputSchema,
	getPerformanceCycleByIdInputSchema,
	listCycleParticipantsInputSchema,
	listPerformanceCyclesInputSchema,
	performanceCycleStatusTransitionInputSchema,
	removeCycleParticipantInputSchema,
	updatePerformanceCycleInputSchema,
} from "../schemas/performance";
import { fingerprintPerformanceCycleCreate } from "../shared/fingerprint";
import {
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import type {
	PerformanceCycle,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE =
	"performance-cycle" as const;
export type HumanResourcesPerformanceCycleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE;

export async function createPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: createPerformanceCycleInputSchema,
		invalidMessage: "Invalid performance cycle create input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPerformanceCycleCreate({
				code: data.code,
				name: data.name,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				weightingModel: data.weightingModel,
			});

			const existingByKey = await store.findPerformanceCycleByIdempotencyKey({
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
				return ok(existingByKey.data.cycle);
			}

			return store.createPerformanceCycle(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					ratingScale: data.ratingScale,
					weightingModel: data.weightingModel,
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

export async function updatePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: updatePerformanceCycleInputSchema,
		invalidMessage: "Invalid performance cycle update input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
		execute: (data, { store, ports }) =>
			store.updatePerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					name: data.name,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function openPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle open input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
		execute: (data, { store, ports }) =>
			store.openPerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function closePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle close input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
		execute: (data, { store, ports }) =>
			store.closePerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle cancel input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelPerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function addCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCommand(input, options, {
		schema: addCycleParticipantInputSchema,
		invalidMessage: "Invalid cycle participant add input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
		execute: (data, { store, ports }) =>
			store.addCycleParticipant(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function removeCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCommand(input, options, {
		schema: removeCycleParticipantInputSchema,
		invalidMessage: "Invalid cycle participant remove input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
		execute: (data, { store, ports }) =>
			store.removeCycleParticipant(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					participantId: data.participantId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getPerformanceCycleById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle | null>> {
	return runPerformanceQuery(input, options, {
		schema: getPerformanceCycleByIdInputSchema,
		invalidMessage: "Invalid performance cycle get input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET,
		execute: (data, { store }) =>
			store.getPerformanceCycleById({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}

export async function listPerformanceCycles(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listPerformanceCyclesInputSchema,
		invalidMessage: "Invalid performance cycle list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST,
		execute: (data, { store }) =>
			store.listPerformanceCycles({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}

export async function listCycleParticipants(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant[]>> {
	return runPerformanceQuery(input, options, {
		schema: listCycleParticipantsInputSchema,
		invalidMessage: "Invalid cycle participants list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
		execute: (data, { store }) =>
			store.listCycleParticipants({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}
