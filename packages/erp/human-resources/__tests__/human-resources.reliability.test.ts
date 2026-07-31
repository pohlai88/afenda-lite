import { errorResult, type Result } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	acknowledgeReliabilityWork,
	checkpointConnectorCursor,
	claimDueReliabilityWork,
	createMemoryReliabilityStore,
	decidePartialOutage,
	executeReliabilityWork,
	type ReliabilityExecutionOutcome,
	type ReliabilityKernelPorts,
	type ReliabilityStorePort,
	recoverConnectorCursor,
	registerReliabilityWork,
	replayDeadLetter,
	retryDelayMs,
} from "../src/reliability";
import { runSequential } from "../src/shared/run-sequential";

const ORGANIZATION_ID = "org-reliability";

function createHarness(
	outcomes: Result<ReliabilityExecutionOutcome>[] = [
		errorResult.ok({ kind: "acknowledged", receiptId: "receipt-1" }),
	],
) {
	let now = new Date("2026-01-01T00:00:00.000Z");
	let executions = 0;
	const store = createMemoryReliabilityStore();
	const ports: ReliabilityKernelPorts = {
		store,
		clock: { now: () => new Date(now) },
		executor: {
			async execute() {
				executions += 1;
				return await (outcomes.shift() ??
					errorResult.ok({
						kind: "acknowledged",
						receiptId: "receipt-replay",
					}));
			},
		},
		failureClassifier: {
			isRetryable: (failure) => failure.code === "INTERNAL_ERROR",
		},
	};
	return {
		ports,
		get executions() {
			return executions;
		},
		advance(milliseconds: number) {
			now = new Date(now.getTime() + milliseconds);
		},
	};
}

async function register(
	ports: ReliabilityKernelPorts,
	idempotencyKey = "idem-1",
) {
	return await registerReliabilityWork(
		{
			organizationId: ORGANIZATION_ID,
			connector: "payroll",
			operation: "publish-delivery",
			targetType: "payroll_delivery",
			targetId: "delivery-1",
			correlationId: "corr-1",
			idempotencyKey,
			requestFingerprint: `fingerprint-${idempotencyKey}`,
		},
		ports,
	);
}

async function claimAndExecute(
	ports: ReliabilityKernelPorts,
	workItemId: string,
	policy?: Parameters<typeof executeReliabilityWork>[0]["policy"],
) {
	const claimed = await claimDueReliabilityWork(
		{
			workerId: "worker-1",
			now: ports.clock.now(),
			leaseDurationMs: 120_000,
			limit: 25,
			perOrganizationLimit: 5,
		},
		ports.store,
	);
	if (!claimed.ok) {
		return claimed;
	}
	const item = claimed.data.find((candidate) => candidate.id === workItemId);
	if (item === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Reliability work was not due",
		});
	}
	return executeReliabilityWork(
		{
			organizationId: item.organizationId,
			workItemId: item.id,
			leaseOwner: "worker-1",
			policy,
		},
		ports,
	);
}

describe("HR integration reliability kernel", () => {
	it("computes bounded exponential retry delays", () => {
		const policy = {
			maxAttempts: 5,
			baseDelayMs: 100,
			maxDelayMs: 500,
			multiplier: 2,
		};
		expect(
			[1, 2, 3, 4, 5].map((attempt) => retryDelayMs(policy, attempt)),
		).toEqual([100, 200, 400, 500, 500]);
	});

	it("retries only when due, then replays terminal success idempotently", async () => {
		const harness = createHarness([
			errorResult.fail("INTERNAL_ERROR"),
			errorResult.ok({ kind: "acknowledged", receiptId: "receipt-recovered" }),
		]);
		const created = await register(harness.ports);
		if (!created.ok) {
			throw new Error(created.message);
		}
		const policy = {
			maxAttempts: 3,
			baseDelayMs: 1000,
			maxDelayMs: 5000,
			multiplier: 2,
		};
		const retrying = await claimAndExecute(
			harness.ports,
			created.data.id,
			policy,
		);
		expect(retrying.ok).toBe(true);
		if (!retrying.ok) {
			return;
		}
		expect(retrying.data).toMatchObject({
			status: "pending",
			attemptCount: 1,
			lastErrorCode: "INTERNAL_ERROR",
		});
		expect(
			await claimAndExecute(harness.ports, created.data.id, policy),
		).toMatchObject({ ok: false, code: "CONFLICT" });

		harness.advance(1000);
		const succeeded = await claimAndExecute(
			harness.ports,
			created.data.id,
			policy,
		);
		expect(succeeded.ok).toBe(true);
		if (!succeeded.ok) {
			return;
		}
		expect(succeeded.data).toMatchObject({
			status: "succeeded",
			attemptCount: 2,
			receiptId: "receipt-recovered",
		});
		expect(
			await executeReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
					leaseOwner: "worker-1",
					policy,
				},
				harness.ports,
			),
		).toEqual(succeeded);
		expect(harness.executions).toBe(2);
	});

	it("atomically dead-letters permanent failure and creates one replay", async () => {
		const harness = createHarness([
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "remote contract rejected payload",
			}),
		]);
		const created = await register(harness.ports);
		if (!created.ok) {
			throw new Error(created.message);
		}
		const terminal = await claimAndExecute(harness.ports, created.data.id);
		expect(terminal.ok).toBe(true);
		if (!terminal.ok) {
			return;
		}
		expect(terminal.data).toMatchObject({
			status: "dead_lettered",
			attemptCount: 1,
		});
		const deadLetter = await harness.ports.store.findDeadLetterByWorkItem({
			organizationId: ORGANIZATION_ID,
			workItemId: created.data.id,
		});
		expect(deadLetter.ok && deadLetter.data).toMatchObject({
			errorCode: "VALIDATION_ERROR",
			requestFingerprint: "fingerprint-idem-1",
		});
		if (!(deadLetter.ok && deadLetter.data)) {
			return;
		}

		const replayed = await replayDeadLetter(
			{
				organizationId: ORGANIZATION_ID,
				deadLetterId: deadLetter.data.id,
				correlationId: "corr-replay",
				idempotencyKey: "idem-replay",
				requestFingerprint: "fingerprint-replay",
			},
			harness.ports,
		);
		expect(replayed.ok).toBe(true);
		if (!replayed.ok) {
			return;
		}
		expect(replayed.data.status).toBe("pending");
		expect(
			await replayDeadLetter(
				{
					organizationId: ORGANIZATION_ID,
					deadLetterId: deadLetter.data.id,
					correlationId: "corr-replay",
					idempotencyKey: "idem-replay",
					requestFingerprint: "fingerprint-replay",
				},
				harness.ports,
			),
		).toEqual(replayed);
	});

	it("recovers after commit failure through executor idempotency", async () => {
		const durableStore = createMemoryReliabilityStore();
		let rejectFirstCommit = true;
		let executorCalls = 0;
		const externalReceipts = new Map<string, string>();
		const store: ReliabilityStorePort = {
			...durableStore,
			commitAttempt(input) {
				if (rejectFirstCommit) {
					rejectFirstCommit = false;
					return Promise.resolve(errorResult.fail("INTERNAL_ERROR"));
				}
				return durableStore.commitAttempt(input);
			},
		};
		let now = new Date("2026-01-01T00:00:00.000Z");
		const ports: ReliabilityKernelPorts = {
			store,
			clock: { now: () => new Date(now) },
			executor: {
				async execute(item) {
					executorCalls += 1;
					const key = `${item.id}:${item.requestFingerprint}`;
					const receiptId = externalReceipts.get(key) ?? "receipt-deduplicated";
					externalReceipts.set(key, receiptId);
					return await errorResult.ok({ kind: "acknowledged", receiptId });
				},
			},
			failureClassifier: { isRetryable: () => true },
		};
		const created = await register(ports, "idem-commit-recovery");
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const interrupted = await claimAndExecute(ports, created.data.id);
		expect(interrupted).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(
			await store.getWorkItem({
				organizationId: ORGANIZATION_ID,
				workItemId: created.data.id,
			}),
		).toMatchObject({
			ok: true,
			data: { status: "processing", attemptCount: 0 },
		});

		now = new Date(now.getTime() + 120_001);
		const recovered = await claimAndExecute(ports, created.data.id);
		expect(recovered).toMatchObject({
			ok: true,
			data: {
				status: "succeeded",
				attemptCount: 1,
				receiptId: "receipt-deduplicated",
			},
		});
		expect(executorCalls).toBe(2);
		expect(externalReceipts).toHaveLength(1);
	});

	it("holds accepted work until a matching acknowledgement arrives", async () => {
		const deadline = new Date("2026-01-01T01:00:00.000Z");
		const harness = createHarness([
			errorResult.ok({
				kind: "accepted",
				receiptId: "receipt-async",
				acknowledgementDeadlineAt: deadline,
			}),
		]);
		const created = await register(harness.ports, "idem-async");
		if (!created.ok) {
			throw new Error(created.message);
		}
		const accepted = await claimAndExecute(harness.ports, created.data.id);
		expect(accepted).toMatchObject({
			ok: true,
			data: {
				status: "awaiting_acknowledgement",
				receiptId: "receipt-async",
			},
		});
		if (!accepted.ok) {
			return;
		}
		expect(
			await acknowledgeReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
					receiptId: "receipt-async",
					expectedVersion: accepted.data.version - 1,
					outcome: "acknowledged",
				},
				harness.ports,
			),
		).toMatchObject({ ok: false, code: "CONFLICT" });
		expect(
			await acknowledgeReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
					receiptId: "wrong-receipt",
					expectedVersion: accepted.data.version,
					outcome: "acknowledged",
				},
				harness.ports,
			),
		).toMatchObject({ ok: false, code: "CONFLICT" });
		const acknowledged = await acknowledgeReliabilityWork(
			{
				organizationId: ORGANIZATION_ID,
				workItemId: created.data.id,
				receiptId: "receipt-async",
				expectedVersion: accepted.data.version,
				outcome: "acknowledged",
			},
			harness.ports,
		);
		expect(acknowledged).toMatchObject({
			ok: true,
			data: { status: "succeeded" },
		});
		expect(
			await acknowledgeReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
					receiptId: "receipt-async",
					expectedVersion: accepted.data.version,
					outcome: "acknowledged",
				},
				harness.ports,
			),
		).toEqual(acknowledged);
	});

	it("reclaims work whose acknowledgement deadline expired", async () => {
		const harness = createHarness([
			errorResult.ok({
				kind: "accepted",
				receiptId: "receipt-expiring",
				acknowledgementDeadlineAt: new Date("2026-01-01T00:01:00.000Z"),
			}),
			errorResult.ok({ kind: "acknowledged", receiptId: "receipt-reissued" }),
		]);
		const created = await register(harness.ports, "idem-expiring");
		if (!created.ok) {
			throw new Error(created.message);
		}
		expect(await claimAndExecute(harness.ports, created.data.id)).toMatchObject(
			{
				ok: true,
				data: { status: "awaiting_acknowledgement" },
			},
		);
		harness.advance(60_000);
		expect(await claimAndExecute(harness.ports, created.data.id)).toMatchObject(
			{
				ok: true,
				data: { status: "succeeded", receiptId: "receipt-reissued" },
			},
		);
	});

	it("rejects accepted outcomes without future acknowledgement evidence", async () => {
		const harness = createHarness([
			errorResult.ok({
				kind: "accepted",
				receiptId: "receipt-invalid-deadline",
				acknowledgementDeadlineAt: new Date("2026-01-01T00:00:00.000Z"),
			}),
		]);
		const created = await register(harness.ports, "idem-invalid-ack");
		if (!created.ok) {
			throw new Error(created.message);
		}
		expect(await claimAndExecute(harness.ports, created.data.id)).toMatchObject(
			{
				ok: true,
				data: {
					status: "pending",
					lastErrorCode: "INTERNAL_ERROR",
					receiptId: null,
				},
			},
		);
	});

	it("rejects unsupported work and claims due work fairly across tenants", async () => {
		const harness = createHarness();
		expect(
			await registerReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					connector: "unknown",
					operation: "publish",
					targetType: "unknown",
					targetId: "target-1",
					correlationId: "corr-unsupported",
					idempotencyKey: "idem-unsupported",
					requestFingerprint: "fingerprint-unsupported",
				},
				harness.ports,
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		await runSequential(["org-a", "org-a", "org-b"], async (organizationId) => {
			await registerReliabilityWork(
				{
					organizationId,
					connector: "search",
					operation: "rebuild-employee-index",
					targetType: "organization",
					targetId: organizationId,
					correlationId: `corr-${crypto.randomUUID()}`,
					idempotencyKey: `idem-${crypto.randomUUID()}`,
					requestFingerprint: `fingerprint-${crypto.randomUUID()}`,
				},
				harness.ports,
			);
		});
		const claimed = await claimDueReliabilityWork(
			{
				workerId: "fair-worker",
				now: harness.ports.clock.now(),
				leaseDurationMs: 120_000,
				limit: 3,
				perOrganizationLimit: 1,
			},
			harness.ports.store,
		);
		expect(claimed.ok && claimed.data).toHaveLength(2);
		if (claimed.ok) {
			expect(new Set(claimed.data.map((item) => item.organizationId))).toEqual(
				new Set(["org-a", "org-b"]),
			);
		}
	});

	it("recovers the last committed connector cursor with version CAS", async () => {
		const harness = createHarness();
		expect(
			await recoverConnectorCursor(
				{
					organizationId: ORGANIZATION_ID,
					connector: "benefits",
					stream: "enrollments",
				},
				harness.ports.store,
			),
		).toEqual(errorResult.ok(null));
		const first = await checkpointConnectorCursor(
			{
				organizationId: ORGANIZATION_ID,
				connector: "benefits",
				stream: "enrollments",
				cursor: "page-10",
				expectedVersion: null,
			},
			harness.ports,
		);
		expect(first.ok).toBe(true);
		const stale = await checkpointConnectorCursor(
			{
				organizationId: ORGANIZATION_ID,
				connector: "benefits",
				stream: "enrollments",
				cursor: "page-11",
				expectedVersion: null,
			},
			harness.ports,
		);
		expect(stale).toMatchObject({ ok: false, code: "CONFLICT" });
		const recovered = await recoverConnectorCursor(
			{
				organizationId: ORGANIZATION_ID,
				connector: "benefits",
				stream: "enrollments",
			},
			harness.ports.store,
		);
		expect(recovered.ok && recovered.data).toMatchObject({
			cursor: "page-10",
			version: 1,
		});
	});

	it("pauses on required outage and degrades on optional outage", () => {
		expect(
			decidePartialOutage([
				{ name: "payroll-api", required: true, health: "unavailable" },
				{ name: "analytics", required: false, health: "degraded" },
			]),
		).toEqual({ action: "pause", blockingDependencies: ["payroll-api"] });
		expect(
			decidePartialOutage([
				{ name: "payroll-api", required: true, health: "healthy" },
				{ name: "analytics", required: false, health: "degraded" },
			]),
		).toEqual({ action: "degrade", unavailableOptional: ["analytics"] });
	});
});
