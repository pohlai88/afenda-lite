// biome-ignore-all lint/performance/noAwaitInLoops: Sequential claim/execute is the resume and retry contract under test.
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import type { PayrollJobChunkExecutorPort } from "../src/features/payroll-jobs/contract";
import {
	claimDuePayrollJobWork,
	enqueuePayrollCalculationJob,
	executePayrollJobWork,
	getPayrollJob,
	listPayrollDeadLetters,
	replayPayrollDeadLetter,
} from "../src/features/payroll-jobs/jobs.command";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-jobs";
const ACTOR_ID = "actor-payroll-jobs";
const RUN_ID = "00000000-0000-4000-8000-000000000b01";
const WORKER_ID = "worker-payroll-jobs";

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function recordingExecutor(): PayrollJobChunkExecutorPort & {
	calls: string[][];
} {
	const calls: string[][] = [];
	return {
		calls,
		executeChunk(input) {
			calls.push([...input.employeeIds]);
			return Promise.resolve(
				errorResult.ok({ processedEmployeeIds: input.employeeIds }),
			);
		},
	};
}

function failingExecutor(code = "INTERNAL_ERROR"): PayrollJobChunkExecutorPort {
	return {
		executeChunk() {
			return Promise.resolve(
				errorResult.fail(code, {
					publicMessage: "Chunk execution failed",
				}),
			);
		},
	};
}

describe("payroll-jobs", () => {
	it("resumes a 5000-employee calculation job after a crash at employee 4000", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const executor = recordingExecutor();
		const employeeIds = Array.from(
			{ length: 5000 },
			(_, index) => `employee-${String(index + 1).padStart(4, "0")}`,
		);
		const options = {
			store,
			ports,
			authorization: authorization([PAYROLL_PERMISSION_RUN_CALCULATE]),
			jobChunkExecutor: executor,
		};

		const enqueued = await enqueuePayrollCalculationJob(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-resume",
				runId: RUN_ID,
				employeeIds,
				chunkSize: 1000,
				idempotencyKey: "job-resume-1",
			},
			options,
		);
		expect(enqueued.ok).toBe(true);
		if (!enqueued.ok) {
			return;
		}

		// Sequential claim/execute is the resume contract — chunks must not overlap.
		for (let chunk = 0; chunk < 4; chunk += 1) {
			const claimed = await claimDuePayrollJobWork(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					correlationId: "corr-jobs-resume",
					workerId: WORKER_ID,
				},
				options,
			);
			expect(claimed.ok).toBe(true);
			if (!claimed.ok) {
				return;
			}
			expect(claimed.data).toHaveLength(1);
			const executed = await executePayrollJobWork(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					correlationId: "corr-jobs-resume",
					workItemId: claimed.data[0]?.id,
					workerId: WORKER_ID,
				},
				options,
			);
			expect(executed.ok).toBe(true);
		}

		expect(executor.calls).toHaveLength(4);
		expect(executor.calls.flat()).toHaveLength(4000);

		const mid = await getPayrollJob(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				jobId: enqueued.data.id,
			},
			{
				store,
				authorization: authorization([PAYROLL_PERMISSION_RUN_REVIEW]),
			},
		);
		expect(mid.ok).toBe(true);
		if (!mid.ok) {
			return;
		}
		expect(mid.data.checkpoint.nextIndex).toBe(4000);
		expect(mid.data.checkpoint.processedEmployeeIds).toHaveLength(4000);

		const resumedClaim = await claimDuePayrollJobWork(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-resume",
				workerId: WORKER_ID,
			},
			options,
		);
		expect(resumedClaim.ok).toBe(true);
		if (!resumedClaim.ok) {
			return;
		}
		const finished = await executePayrollJobWork(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-resume",
				workItemId: resumedClaim.data[0]?.id,
				workerId: WORKER_ID,
			},
			options,
		);
		expect(finished.ok).toBe(true);
		if (!finished.ok) {
			return;
		}
		expect(finished.data.status).toBe("completed");
		expect(finished.data.checkpoint.nextIndex).toBe(5000);
		expect(executor.calls).toHaveLength(5);
		expect(executor.calls[4]).toEqual(employeeIds.slice(4000));
		expect(executor.calls.flat()).toEqual(employeeIds);
	});

	it("reclaims expired leases instead of restarting processed chunks", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const executor = recordingExecutor();
		const options = {
			store,
			ports,
			authorization: authorization([PAYROLL_PERMISSION_RUN_CALCULATE]),
			jobChunkExecutor: executor,
			clock: {
				now: () => new Date("2026-08-05T00:00:00.000Z"),
				today: () => "2026-08-05",
			},
		};
		const enqueued = await enqueuePayrollCalculationJob(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-lease",
				runId: RUN_ID,
				employeeIds: ["e-1", "e-2"],
				chunkSize: 1,
				idempotencyKey: "job-lease-1",
			},
			options,
		);
		expect(enqueued.ok).toBe(true);
		const claimed = await claimDuePayrollJobWork(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-lease",
				workerId: "worker-a",
				leaseDurationMs: 1000,
			},
			options,
		);
		expect(claimed.ok).toBe(true);
		if (!claimed.ok) {
			return;
		}

		const expiredOptions = {
			...options,
			clock: {
				now: () => new Date("2026-08-05T00:00:02.000Z"),
				today: () => "2026-08-05",
			},
		};
		const reclaimed = await claimDuePayrollJobWork(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-lease",
				workerId: "worker-b",
				leaseDurationMs: 1000,
			},
			expiredOptions,
		);
		expect(reclaimed.ok).toBe(true);
		if (!reclaimed.ok) {
			return;
		}
		expect(reclaimed.data[0]?.id).toBe(claimed.data[0]?.id);
		expect(reclaimed.data[0]?.leaseOwner).toBe("worker-b");
	});

	it("dead-letters after retry exhaustion and replays without losing checkpoint", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const options = {
			store,
			ports,
			authorization: authorization([PAYROLL_PERMISSION_RUN_CALCULATE]),
			jobChunkExecutor: failingExecutor(),
		};
		const enqueued = await enqueuePayrollCalculationJob(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-dlq",
				runId: RUN_ID,
				employeeIds: ["e-1", "e-2", "e-3"],
				chunkSize: 1,
				idempotencyKey: "job-dlq-1",
			},
			options,
		);
		expect(enqueued.ok).toBe(true);
		if (!enqueued.ok) {
			return;
		}

		// Sequential retries prove backoff + terminal dead-letter, not parallel claims.
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const claimed = await claimDuePayrollJobWork(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					correlationId: "corr-jobs-dlq",
					workerId: WORKER_ID,
					leaseDurationMs: 1000,
				},
				{
					...options,
					clock: {
						now: () => new Date(Date.UTC(2026, 7, 5, 0, attempt * 10)),
						today: () => "2026-08-05",
					},
				},
			);
			expect(claimed.ok).toBe(true);
			if (!claimed.ok) {
				return;
			}
			await executePayrollJobWork(
				{
					organizationId: ORGANIZATION_ID,
					actorUserId: ACTOR_ID,
					correlationId: "corr-jobs-dlq",
					workItemId: claimed.data[0]?.id,
					workerId: WORKER_ID,
				},
				{
					...options,
					clock: {
						now: () => new Date(Date.UTC(2026, 7, 5, 0, attempt * 10, 1)),
						today: () => "2026-08-05",
					},
				},
			);
		}

		const deadLetters = await listPayrollDeadLetters(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				jobId: enqueued.data.id,
			},
			{
				store,
				authorization: authorization([PAYROLL_PERMISSION_RUN_REVIEW]),
			},
		);
		expect(deadLetters.ok).toBe(true);
		if (!deadLetters.ok) {
			return;
		}
		expect(deadLetters.data).toHaveLength(1);

		const replayed = await replayPayrollDeadLetter(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-jobs-dlq",
				deadLetterId: deadLetters.data[0]?.id,
				idempotencyKey: "job-dlq-replay-1",
			},
			options,
		);
		expect(replayed.ok).toBe(true);
		if (!replayed.ok) {
			return;
		}
		expect(replayed.data.checkpoint.nextIndex).toBe(0);
		expect(replayed.data.status).toBe("queued");
	});

	it("replays identical enqueue fingerprints and rejects conflicts", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts();
		const options = {
			store,
			ports,
			authorization: authorization([PAYROLL_PERMISSION_RUN_CALCULATE]),
			jobChunkExecutor: recordingExecutor(),
		};
		const input = {
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_ID,
			correlationId: "corr-jobs-idem",
			runId: RUN_ID,
			employeeIds: ["e-1"],
			chunkSize: 1,
			idempotencyKey: "job-idem-1",
		};
		const first = await enqueuePayrollCalculationJob(input, options);
		const second = await enqueuePayrollCalculationJob(input, options);
		expect(first.ok && second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).toBe(first.data.id);

		const conflict = await enqueuePayrollCalculationJob(
			{ ...input, employeeIds: ["e-2"] },
			options,
		);
		expect(conflict.ok).toBe(false);
	});
});
