import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	HUMAN_RESOURCES_QUERY_WORKER_GET,
} from "../module-ids";
import {
	changeWorkerStatusInputSchema,
	changeWorkerTypeInputSchema,
	createWorkerInputSchema,
	getWorkerInputSchema,
} from "../schemas/workforce-foundation";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { fingerprintWorkerCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { EmployeeWorker, NonEmployeeWorker, Worker } from "./types";

export async function createWorker(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runCoreCommand(input, options, {
		schema: createWorkerInputSchema,
		invalidMessage: "Invalid worker create input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintWorkerCreate({
				personId: data.personId,
				workerType: data.workerType,
				employeeId:
					data.workerType === "employee" ? (data.employeeId ?? null) : null,
				status: data.status ?? "active",
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});

			const existingByKey = await store.findWorkerByIdempotencyKey({
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
				return ok(existingByKey.data.worker);
			}

			const baseRecord = {
				organizationId: data.organizationId,
				personId: data.personId,
				status: data.status ?? "active",
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
				createIdempotencyKey: data.idempotencyKey,
				createRequestFingerprint: requestFingerprint,
				createdBy: data.actorUserId,
			};

			const record =
				data.workerType === "employee"
					? {
							...baseRecord,
							workerType: "employee" as const,
							employeeId: data.employeeId ?? null,
						}
					: {
							...baseRecord,
							workerType: data.workerType,
							employeeId: null,
						};

			return store.createWorker(
				record,
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
				}),
			);
		},
	});
}

export async function changeWorkerType(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeWorker | NonEmployeeWorker>> {
	return runCoreCommand(input, options, {
		schema: changeWorkerTypeInputSchema,
		invalidMessage: "Invalid worker type change input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
		execute: async (data, { store, ports }) => {
			const payload =
				data.workerType === "employee"
					? {
							organizationId: data.organizationId,
							workerId: data.workerId,
							workerType: "employee" as const,
							employeeId: data.employeeId ?? null,
							effectiveOn: data.effectiveOn,
							expectedVersion: data.expectedVersion,
							actorUserId: data.actorUserId,
						}
					: {
							organizationId: data.organizationId,
							workerId: data.workerId,
							workerType: data.workerType,
							employeeId: null,
							effectiveOn: data.effectiveOn,
							expectedVersion: data.expectedVersion,
							actorUserId: data.actorUserId,
						};

			return store.changeWorkerType(
				payload,
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
				}),
			);
		},
	});
}

export async function changeWorkerStatus(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runCoreCommand(input, options, {
		schema: changeWorkerStatusInputSchema,
		invalidMessage: "Invalid worker status change input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
		execute: async (data, { store, ports }) => {
			return store.changeWorkerStatus(
				{
					organizationId: data.organizationId,
					workerId: data.workerId,
					status: data.status,
					effectiveOn: data.effectiveOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
				}),
			);
		},
	});
}

export async function getWorkerById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runCoreQuery(input, options, {
		schema: getWorkerInputSchema,
		invalidMessage: "Invalid worker get input",
		query: HUMAN_RESOURCES_QUERY_WORKER_GET,
		execute: async (data, { store }) => {
			const result = await store.getWorkerById({
				organizationId: data.organizationId,
				workerId: data.workerId,
			});
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return fail("NOT_FOUND", "Worker not found");
			}
			return ok(result.data);
		},
	});
}
