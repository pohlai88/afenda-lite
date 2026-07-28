import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	checkpointConnectorCursor,
	createMemoryReliabilityStore,
	decidePartialOutage,
	executeReliabilityWork,
	type ReliabilityKernelPorts,
	type ReliabilityStorePort,
	recoverConnectorCursor,
	registerReliabilityWork,
	replayDeadLetter,
	retryDelayMs,
} from "../src/reliability";

const ORGANIZATION_ID = "org-reliability";

function createHarness(
	outcomes: Result<{ receiptId: string | null }>[] = [
		ok({ receiptId: "receipt-1" }),
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
				return outcomes.shift() ?? ok({ receiptId: "receipt-replay" });
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
	return registerReliabilityWork(
		{
			organizationId: ORGANIZATION_ID,
			connector: "payroll",
			operation: "publish-handoff",
			correlationId: "corr-1",
			idempotencyKey,
			requestFingerprint: `fingerprint-${idempotencyKey}`,
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
			fail("INTERNAL_ERROR", "connector timeout"),
			ok({ receiptId: "receipt-recovered" }),
		]);
		const created = await register(harness.ports);
		if (!created.ok) throw new Error(created.message);
		const policy = {
			maxAttempts: 3,
			baseDelayMs: 1_000,
			maxDelayMs: 5_000,
			multiplier: 2,
		};
		const retrying = await executeReliabilityWork(
			{
				organizationId: ORGANIZATION_ID,
				workItemId: created.data.id,
				policy,
			},
			harness.ports,
		);
		expect(retrying.ok).toBe(true);
		if (!retrying.ok) return;
		expect(retrying.data).toMatchObject({
			status: "pending",
			attemptCount: 1,
			lastErrorCode: "INTERNAL_ERROR",
		});
		expect(
			await executeReliabilityWork(
				{
					organizationId: ORGANIZATION_ID,
					workItemId: created.data.id,
					policy,
				},
				harness.ports,
			),
		).toMatchObject({ ok: false, code: "CONFLICT" });

		harness.advance(1_000);
		const succeeded = await executeReliabilityWork(
			{
				organizationId: ORGANIZATION_ID,
				workItemId: created.data.id,
				policy,
			},
			harness.ports,
		);
		expect(succeeded.ok).toBe(true);
		if (!succeeded.ok) return;
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
					policy,
				},
				harness.ports,
			),
		).toEqual(succeeded);
		expect(harness.executions).toBe(2);
	});

	it("atomically dead-letters permanent failure and creates one replay", async () => {
		const harness = createHarness([
			fail("VALIDATION_ERROR", "remote contract rejected payload"),
		]);
		const created = await register(harness.ports);
		if (!created.ok) throw new Error(created.message);
		const terminal = await executeReliabilityWork(
			{ organizationId: ORGANIZATION_ID, workItemId: created.data.id },
			harness.ports,
		);
		expect(terminal.ok).toBe(true);
		if (!terminal.ok) return;
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
		if (!deadLetter.ok || !deadLetter.data) return;

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
		if (!replayed.ok) return;
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
					return Promise.resolve(
						fail("INTERNAL_ERROR", "simulated transaction commit failure"),
					);
				}
				return durableStore.commitAttempt(input);
			},
		};
		const ports: ReliabilityKernelPorts = {
			store,
			clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
			executor: {
				async execute(item) {
					executorCalls += 1;
					const key = `${item.id}:${item.requestFingerprint}`;
					const receiptId = externalReceipts.get(key) ?? "receipt-deduplicated";
					externalReceipts.set(key, receiptId);
					return ok({ receiptId });
				},
			},
			failureClassifier: { isRetryable: () => true },
		};
		const created = await register(ports, "idem-commit-recovery");
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const interrupted = await executeReliabilityWork(
			{ organizationId: ORGANIZATION_ID, workItemId: created.data.id },
			ports,
		);
		expect(interrupted).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		expect(
			await store.getWorkItem({
				organizationId: ORGANIZATION_ID,
				workItemId: created.data.id,
			}),
		).toMatchObject({ ok: true, data: { status: "pending", attemptCount: 0 } });

		const recovered = await executeReliabilityWork(
			{ organizationId: ORGANIZATION_ID, workItemId: created.data.id },
			ports,
		);
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
		).toEqual(ok(null));
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
