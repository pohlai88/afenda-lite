import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import {
	PAYROLL_COMMAND_JOB_CALCULATION_ENQUEUE,
	PAYROLL_COMMAND_JOB_DEAD_LETTER_REPLAY,
	PAYROLL_COMMAND_JOB_WORK_CLAIM,
	PAYROLL_COMMAND_JOB_WORK_EXECUTE,
	PAYROLL_QUERY_JOB_DEAD_LETTER_LIST,
	PAYROLL_QUERY_JOB_GET,
} from "../../kernel/operations/module-ids";
import type {
	PayrollJob,
	PayrollJobChunkExecutorPort,
	PayrollJobDeadLetter,
	PayrollJobEmployeeDirectoryPort,
	PayrollJobWorkItem,
} from "./contract";
import { fingerprintPayrollJob } from "./fingerprint";
import {
	claimDuePayrollJobWorkInputSchema,
	enqueuePayrollCalculationJobInputSchema,
	executePayrollJobWorkInputSchema,
	getPayrollJobInputSchema,
	listPayrollDeadLettersInputSchema,
	replayPayrollDeadLetterInputSchema,
} from "./jobs.schema";
import type { PayrollJobStore } from "./jobs.store";
import {
	DEFAULT_PAYROLL_JOB_CHUNK_SIZE,
	DEFAULT_PAYROLL_JOB_LEASE_MS,
	DEFAULT_PAYROLL_JOB_RETRY_POLICY,
	MAX_PAYROLL_JOB_EMPLOYEES,
	payrollJobRetryDelayMs,
	validatePayrollJobRetryPolicy,
} from "./retry";

export type PayrollJobCommandOptions =
	GenericPayrollCommandOptions<PayrollJobStore> & {
		jobChunkExecutor?: PayrollJobChunkExecutorPort;
		jobEmployees?: PayrollJobEmployeeDirectoryPort;
	};

function requireChunkExecutor(
	options: PayrollJobCommandOptions,
): Result<PayrollJobChunkExecutorPort> {
	if (options.jobChunkExecutor === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payroll job chunk executor is not composed.",
		});
	}
	return errorResult.ok(options.jobChunkExecutor);
}

function nowFrom(options: PayrollJobCommandOptions): Date {
	return options.clock?.now() ?? new Date();
}

function succeededWorkItem(
	currentWork: PayrollJobWorkItem,
	attemptCount: number,
	now: Date,
): PayrollJobWorkItem {
	return {
		...currentWork,
		status: "succeeded",
		attemptCount,
		lastAttemptAt: now,
		lastErrorCode: null,
		lastErrorMessage: null,
		leaseOwner: null,
		leaseExpiresAt: null,
		version: currentWork.version + 1,
		updatedAt: now,
	};
}

function saveEmptyChunkCompletion(input: {
	attemptCount: number;
	currentJob: PayrollJob;
	currentWork: PayrollJobWorkItem;
	now: Date;
	store: PayrollJobStore;
}): Promise<Result<PayrollJob>> {
	const { attemptCount, currentJob, currentWork, now, store } = input;
	return store.saveJobProgress({
		expectedJobVersion: currentJob.version,
		expectedWorkVersion: currentWork.version,
		job: {
			...currentJob,
			status: "completed",
			completedAt: now,
			version: currentJob.version + 1,
			updatedAt: now,
		},
		workItem: succeededWorkItem(currentWork, attemptCount, now),
		successorWorkItem: null,
		deadLetter: null,
	});
}

function saveChunkFailure(input: {
	attemptCount: number;
	currentJob: PayrollJob;
	currentWork: PayrollJobWorkItem;
	errorCode: string;
	errorMessage: string;
	now: Date;
	organizationId: string;
	retryDelayMs: number;
	store: PayrollJobStore;
	terminal: boolean;
}): Promise<Result<PayrollJob>> {
	const {
		attemptCount,
		currentJob,
		currentWork,
		errorCode,
		errorMessage,
		now,
		organizationId,
		retryDelayMs,
		store,
		terminal,
	} = input;
	const deadLetter: PayrollJobDeadLetter | null = terminal
		? {
				id: randomUUID(),
				organizationId,
				jobId: currentJob.id,
				workItemId: currentWork.id,
				errorCode,
				errorMessage,
				attemptCount,
				failedAt: now,
				replayedByWorkItemId: null,
			}
		: null;
	return store.saveJobProgress({
		expectedJobVersion: currentJob.version,
		expectedWorkVersion: currentWork.version,
		job: {
			...currentJob,
			status: terminal ? "dead_lettered" : "failed",
			lastErrorCode: errorCode,
			lastErrorMessage: errorMessage,
			version: currentJob.version + 1,
			updatedAt: now,
		},
		workItem: {
			...currentWork,
			status: terminal ? "dead_lettered" : "pending",
			attemptCount,
			lastAttemptAt: now,
			lastErrorCode: errorCode,
			lastErrorMessage: errorMessage,
			leaseOwner: null,
			leaseExpiresAt: null,
			nextAttemptAt: terminal
				? currentWork.nextAttemptAt
				: new Date(now.getTime() + retryDelayMs),
			version: currentWork.version + 1,
			updatedAt: now,
		},
		successorWorkItem: null,
		deadLetter,
	});
}

function saveChunkSuccess(input: {
	attemptCount: number;
	checkpoint: PayrollJob["checkpoint"];
	currentJob: PayrollJob;
	currentWork: PayrollJobWorkItem;
	nextIndex: number;
	now: Date;
	organizationId: string;
	processedEmployeeIds: readonly string[];
	store: PayrollJobStore;
}): Promise<Result<PayrollJob>> {
	const {
		attemptCount,
		checkpoint,
		currentJob,
		currentWork,
		nextIndex,
		now,
		organizationId,
		processedEmployeeIds,
		store,
	} = input;
	const completed = nextIndex >= checkpoint.employeeIds.length;
	const successorWorkItem: PayrollJobWorkItem | null = completed
		? null
		: {
				id: randomUUID(),
				organizationId,
				jobId: currentJob.id,
				status: "pending",
				attemptCount: 0,
				nextAttemptAt: now,
				lastAttemptAt: null,
				leaseOwner: null,
				leaseExpiresAt: null,
				lastErrorCode: null,
				lastErrorMessage: null,
				idempotencyKey: `payroll-job:${currentJob.id}:${nextIndex}`,
				requestFingerprint: currentJob.requestFingerprint,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
	return store.saveJobProgress({
		expectedJobVersion: currentJob.version,
		expectedWorkVersion: currentWork.version,
		job: {
			...currentJob,
			status: completed ? "completed" : "running",
			checkpoint: {
				...checkpoint,
				nextIndex,
				processedEmployeeIds: [
					...checkpoint.processedEmployeeIds,
					...processedEmployeeIds,
				],
			},
			lastErrorCode: null,
			lastErrorMessage: null,
			completedAt: completed ? now : null,
			version: currentJob.version + 1,
			updatedAt: now,
		},
		workItem: succeededWorkItem(currentWork, attemptCount, now),
		successorWorkItem,
		deadLetter: null,
	});
}

export function enqueuePayrollCalculationJob(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<PayrollJob>> {
	return runPayrollCommand(input, options, {
		schema: enqueuePayrollCalculationJobInputSchema,
		invalidMessage: "Invalid payroll calculation job input",
		command: PAYROLL_COMMAND_JOB_CALCULATION_ENQUEUE,
		execute: async (data, { store }) => {
			const {
				actorUserId,
				chunkSize: requestedChunkSize,
				correlationId,
				employeeIds: requestedEmployeeIds,
				idempotencyKey,
				organizationId,
				runId,
			} = data;
			const chunkSize = requestedChunkSize ?? DEFAULT_PAYROLL_JOB_CHUNK_SIZE;
			let employeeIds = requestedEmployeeIds;
			if (employeeIds === undefined) {
				if (options.jobEmployees === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Payroll job employee directory is not composed.",
					});
				}
				const listed = await options.jobEmployees.listEmployeeIdsForRun({
					organizationId,
					runId,
					actorUserId,
					correlationId,
				});
				if (!listed.ok) {
					return listed;
				}
				const { data: listedIds } = listed;
				employeeIds = [...listedIds];
			}
			if (
				employeeIds.length < 1 ||
				employeeIds.length > MAX_PAYROLL_JOB_EMPLOYEES ||
				chunkSize < 1
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const requestFingerprint = fingerprintPayrollJob({
				organizationId,
				runId,
				employeeIds,
				chunkSize,
				idempotencyKey,
			});
			const existing = await store.findJobByIdempotencyKey({
				organizationId,
				idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				const { data: existingJob } = existing;
				return existingJob.requestFingerprint === requestFingerprint
					? errorResult.ok(existingJob)
					: errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						});
			}
			const now = nowFrom(options);
			const jobId = randomUUID();
			const workItemId = randomUUID();
			const job: PayrollJob = {
				id: jobId,
				organizationId,
				kind: "calculate-run",
				status: "queued",
				targetRunId: runId,
				actorUserId,
				correlationId,
				idempotencyKey,
				requestFingerprint,
				checkpoint: {
					kind: "calculate-run",
					runId,
					employeeIds,
					nextIndex: 0,
					chunkSize,
					processedEmployeeIds: [],
				},
				lastErrorCode: null,
				lastErrorMessage: null,
				completedAt: null,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			const workItem: PayrollJobWorkItem = {
				id: workItemId,
				organizationId,
				jobId,
				status: "pending",
				attemptCount: 0,
				nextAttemptAt: now,
				lastAttemptAt: null,
				leaseOwner: null,
				leaseExpiresAt: null,
				lastErrorCode: null,
				lastErrorMessage: null,
				idempotencyKey: `payroll-job:${jobId}:0`,
				requestFingerprint,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			return store.createJob({ job, workItem });
		},
	});
}

export function claimDuePayrollJobWork(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<readonly PayrollJobWorkItem[]>> {
	return runPayrollCommand(input, options, {
		schema: claimDuePayrollJobWorkInputSchema,
		invalidMessage: "Invalid payroll job claim input",
		command: PAYROLL_COMMAND_JOB_WORK_CLAIM,
		execute: (data, { store }) => {
			const now = nowFrom(options);
			const leaseDurationMs =
				data.leaseDurationMs ?? DEFAULT_PAYROLL_JOB_LEASE_MS;
			return store.claimDueWork({
				workerId: data.workerId,
				now,
				leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
				limit: data.limit ?? 10,
			});
		},
	});
}

export function executePayrollJobWork(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<PayrollJob>> {
	return runPayrollCommand(input, options, {
		schema: executePayrollJobWorkInputSchema,
		invalidMessage: "Invalid payroll job execute input",
		command: PAYROLL_COMMAND_JOB_WORK_EXECUTE,
		execute: async (data, { store }) => {
			const policy = DEFAULT_PAYROLL_JOB_RETRY_POLICY;
			if (!validatePayrollJobRetryPolicy(policy)) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const executor = requireChunkExecutor(options);
			if (!executor.ok) {
				return executor;
			}
			const { data: chunkExecutor } = executor;
			const work = await store.getWorkItem({
				organizationId: data.organizationId,
				workItemId: data.workItemId,
			});
			if (!work.ok) {
				return work;
			}
			if (work.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentWork } = work;
			const now = nowFrom(options);
			if (
				currentWork.status !== "processing" ||
				currentWork.leaseOwner !== data.workerId ||
				currentWork.leaseExpiresAt === null ||
				currentWork.leaseExpiresAt <= now
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			const job = await store.getJob({
				organizationId: data.organizationId,
				jobId: currentWork.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentJob } = job;
			const { checkpoint } = currentJob;
			const chunk = checkpoint.employeeIds.slice(
				checkpoint.nextIndex,
				checkpoint.nextIndex + checkpoint.chunkSize,
			);
			const attemptCount = currentWork.attemptCount + 1;
			if (chunk.length === 0) {
				return saveEmptyChunkCompletion({
					attemptCount,
					currentJob,
					currentWork,
					now,
					store,
				});
			}
			const executed = await chunkExecutor.executeChunk({
				organizationId: data.organizationId,
				runId: checkpoint.runId,
				employeeIds: chunk,
				actorUserId: currentJob.actorUserId,
				correlationId: currentJob.correlationId,
			});
			if (executed.ok === false) {
				return saveChunkFailure({
					attemptCount,
					currentJob,
					currentWork,
					errorCode: executed.error.code,
					errorMessage: executed.error.publicMessage,
					now,
					organizationId: data.organizationId,
					retryDelayMs: payrollJobRetryDelayMs(policy, attemptCount),
					store,
					terminal: attemptCount >= policy.maxAttempts,
				});
			}
			const { data: executedChunk } = executed;
			return saveChunkSuccess({
				attemptCount,
				checkpoint,
				currentJob,
				currentWork,
				nextIndex: checkpoint.nextIndex + chunk.length,
				now,
				organizationId: data.organizationId,
				processedEmployeeIds: executedChunk.processedEmployeeIds,
				store,
			});
		},
	});
}

export function replayPayrollDeadLetter(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<PayrollJob>> {
	return runPayrollCommand(input, options, {
		schema: replayPayrollDeadLetterInputSchema,
		invalidMessage: "Invalid payroll dead-letter replay input",
		command: PAYROLL_COMMAND_JOB_DEAD_LETTER_REPLAY,
		execute: async (data, { store }) => {
			const deadLetter = await store.getDeadLetter({
				organizationId: data.organizationId,
				deadLetterId: data.deadLetterId,
			});
			if (!deadLetter.ok) {
				return deadLetter;
			}
			if (deadLetter.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentDeadLetter } = deadLetter;
			if (currentDeadLetter.replayedByWorkItemId !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			const job = await store.getJob({
				organizationId: data.organizationId,
				jobId: currentDeadLetter.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentJob } = job;
			const work = await store.getWorkItem({
				organizationId: data.organizationId,
				workItemId: currentDeadLetter.workItemId,
			});
			if (!work.ok) {
				return work;
			}
			if (work.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentWork } = work;
			const now = nowFrom(options);
			const successor: PayrollJobWorkItem = {
				id: randomUUID(),
				organizationId: data.organizationId,
				jobId: currentJob.id,
				status: "pending",
				attemptCount: 0,
				nextAttemptAt: now,
				lastAttemptAt: null,
				leaseOwner: null,
				leaseExpiresAt: null,
				lastErrorCode: null,
				lastErrorMessage: null,
				idempotencyKey: data.idempotencyKey,
				requestFingerprint: currentJob.requestFingerprint,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			return store.saveJobProgress({
				expectedJobVersion: currentJob.version,
				expectedWorkVersion: currentWork.version,
				job: {
					...currentJob,
					status: "queued",
					lastErrorCode: null,
					lastErrorMessage: null,
					version: currentJob.version + 1,
					updatedAt: now,
				},
				workItem: {
					...currentWork,
					version: currentWork.version + 1,
					updatedAt: now,
				},
				successorWorkItem: successor,
				deadLetter: {
					...currentDeadLetter,
					replayedByWorkItemId: successor.id,
				},
			});
		},
	});
}

export function getPayrollJob(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<PayrollJob>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollJobInputSchema,
		invalidMessage: "Invalid payroll job query",
		query: PAYROLL_QUERY_JOB_GET,
		execute: async (data, { store }) => {
			const job = await store.getJob({
				organizationId: data.organizationId,
				jobId: data.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const { data: currentJob } = job;
			return errorResult.ok(currentJob);
		},
	});
}

export function listPayrollDeadLetters(
	input: unknown,
	options: PayrollJobCommandOptions = {},
): Promise<Result<readonly PayrollJobDeadLetter[]>> {
	return runPayrollQuery(input, options, {
		schema: listPayrollDeadLettersInputSchema,
		invalidMessage: "Invalid payroll dead-letter list query",
		query: PAYROLL_QUERY_JOB_DEAD_LETTER_LIST,
		execute: (data, { store }) =>
			store.listDeadLetters({
				organizationId: data.organizationId,
				...(data.jobId === undefined ? {} : { jobId: data.jobId }),
			}),
	});
}
