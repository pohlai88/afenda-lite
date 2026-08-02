import { errorResult, type Result } from "@afenda/errors";
import { buildMutationMeta } from "../../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import { fingerprintWorkerCreate } from "../../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	HUMAN_RESOURCES_QUERY_WORKER_AS_OF,
	HUMAN_RESOURCES_QUERY_WORKER_GET,
} from "../../../kernel/operations/module-ids";
import {
	runWorkforceFoundationCommand,
	runWorkforceFoundationQuery,
} from "./run-operation";
import {
	changeWorkerStatusInputSchema,
	changeWorkerTypeInputSchema,
	createWorkerInputSchema,
	getWorkerAsOfInputSchema,
	getWorkerInputSchema,
} from "./schema";
import type {
	EmployeeWorker,
	NonEmployeeWorker,
	Worker,
	WorkerClassificationAtAsOf,
} from "./types";

export function createWorker(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runWorkforceFoundationCommand(input, options, {
		schema: createWorkerInputSchema,
		invalidMessage: "Invalid worker create input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
		storeMethods: ["findWorkerByIdempotencyKey", "createWorker"],
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.worker);
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
					operationId: HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
				}),
			);
		},
	});
}

export function changeWorkerType(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeWorker | NonEmployeeWorker>> {
	return runWorkforceFoundationCommand(input, options, {
		schema: changeWorkerTypeInputSchema,
		invalidMessage: "Invalid worker type change input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
		storeMethods: ["changeWorkerType"],
		execute: (data, { store, ports }) => {
			const shared = {
				organizationId: data.organizationId,
				workerId: data.workerId,
				effectiveOn: data.effectiveOn,
				reasonCode: data.reasonCode,
				evidenceRef: data.evidenceRef ?? null,
				expectedVersion: data.expectedVersion,
				actorUserId: data.actorUserId,
			};
			const payload =
				data.workerType === "employee"
					? {
							...shared,
							workerType: "employee" as const,
							employeeId: data.employeeId ?? null,
						}
					: {
							...shared,
							workerType: data.workerType,
							employeeId: null,
						};

			return store.changeWorkerType(
				payload,
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
				}),
			);
		},
	});
}

export function changeWorkerStatus(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runWorkforceFoundationCommand(input, options, {
		schema: changeWorkerStatusInputSchema,
		invalidMessage: "Invalid worker status change input",
		command: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
		storeMethods: ["changeWorkerStatus"],
		execute: async (data, { store, ports }) =>
			store.changeWorkerStatus(
				{
					organizationId: data.organizationId,
					workerId: data.workerId,
					status: data.status,
					effectiveOn: data.effectiveOn,
					reasonCode: data.reasonCode,
					evidenceRef: data.evidenceRef ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
				}),
			),
	});
}

export function getWorkerById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Worker>> {
	return runWorkforceFoundationQuery(input, options, {
		schema: getWorkerInputSchema,
		invalidMessage: "Invalid worker get input",
		query: HUMAN_RESOURCES_QUERY_WORKER_GET,
		storeMethods: ["getWorkerById"],
		execute: async (data, { store }) => {
			const result = await store.getWorkerById({
				organizationId: data.organizationId,
				workerId: data.workerId,
			});
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			return errorResult.ok(result.data);
		},
	});
}

export function getWorkerAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkerClassificationAtAsOf>> {
	return runWorkforceFoundationQuery(input, options, {
		schema: getWorkerAsOfInputSchema,
		invalidMessage: "Invalid worker as-of input",
		query: HUMAN_RESOURCES_QUERY_WORKER_AS_OF,
		storeMethods: ["findWorkerAsOf"],
		execute: async (data, { store }) => {
			const result = await store.findWorkerAsOf({
				organizationId: data.organizationId,
				workerId: data.workerId,
				asOf: data.asOf,
			});
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			return errorResult.ok(result.data);
		},
	});
}
