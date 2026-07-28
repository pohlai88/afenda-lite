import {
	db,
	eq,
	hrBulkImportAudit,
	hrBulkImportCheckpoint,
	hrBulkImportErrorArtifact,
	hrConnectorCursor,
	hrReliabilityDeadLetter,
	hrReliabilityWorkItem,
} from "@afenda/db";
import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createDrizzleBulkCheckpointPort } from "../src/adapters/drizzle/bulk-checkpoint";
import { createDrizzleReliabilityStore } from "../src/adapters/drizzle/reliability";
import {
	type BulkCheckpointPort,
	type BulkImportPorts,
	type BulkImportRequest,
	createMemoryBulkCheckpointPort,
	runHumanResourcesBulkImport,
} from "../src/bulk";
import {
	checkpointConnectorCursor,
	createMemoryReliabilityStore,
	executeReliabilityWork,
	type ReliabilityKernelPorts,
	type ReliabilityStorePort,
	registerReliabilityWork,
	replayDeadLetter,
} from "../src/reliability";
import { runDrizzleParity } from "./helpers/database-gate";

type BulkRow = { value: string };
type BulkOutput = { imported: string };

async function exerciseBulk(store: BulkCheckpointPort<BulkOutput>) {
	const organizationId = `bulk-parity-${crypto.randomUUID()}`;
	const request: BulkImportRequest<BulkRow> = {
		organizationId,
		actorUserId: "actor-1",
		correlationId: "corr-1",
		batchId: "batch-1",
		entityType: "employee",
		mode: "commit",
		idempotencyKey: "bulk-1",
		maxRowsPerRun: 1,
		rows: [
			{ sourceReference: "source-1", payload: { value: "accepted" } },
			{ sourceReference: "source-2", payload: { value: "rejected" } },
		],
	};
	const ports: BulkImportPorts<BulkRow, BulkRow, BulkOutput> = {
		checkpoints: store,
		validate: async ({ row }) => ({ valid: true, value: row.payload }),
		execute: async ({ sourceReference, value }) =>
			value.value === "rejected"
				? {
						status: "terminal_failure",
						issues: [{ code: "REJECTED", message: "Source row rejected" }],
					}
				: { status: "applied", output: { imported: sourceReference } },
	};
	const first = await runHumanResourcesBulkImport(request, ports);
	if (!first.ok) throw new Error(first.message);
	const completed = await runHumanResourcesBulkImport(
		{
			...request,
			expectedCheckpointVersion: first.data.checkpointVersion ?? undefined,
		},
		ports,
	);
	if (!completed.ok) throw new Error(completed.message);
	const replay = await runHumanResourcesBulkImport(request, ports);
	const audit = await store.listAuditEvents({
		organizationId,
		idempotencyKey: request.idempotencyKey,
	});
	const artifact = await store.loadLatestErrorArtifact({
		organizationId,
		idempotencyKey: request.idempotencyKey,
	});
	const wrongTenant = await store.load({
		organizationId: "org-other",
		idempotencyKey: request.idempotencyKey,
	});
	return {
		organizationId,
		first,
		completed,
		replay,
		audit,
		artifact,
		wrongTenant,
	};
}

async function exerciseReliability(store: ReliabilityStorePort) {
	const organizationId = `reliability-parity-${crypto.randomUUID()}`;
	let now = new Date("2026-07-28T00:00:00.000Z");
	const ports: ReliabilityKernelPorts = {
		store,
		clock: { now: () => new Date(now) },
		executor: {
			execute: async () => fail("VALIDATION_ERROR", "Permanent rejection"),
		},
		failureClassifier: { isRetryable: () => false },
	};
	const created = await registerReliabilityWork(
		{
			organizationId,
			connector: "payroll",
			operation: "publish",
			correlationId: "corr-1",
			idempotencyKey: "work-1",
			requestFingerprint: "fingerprint-1",
		},
		ports,
	);
	if (!created.ok) throw new Error(created.message);
	const terminal = await executeReliabilityWork(
		{ organizationId, workItemId: created.data.id },
		ports,
	);
	if (!terminal.ok) throw new Error(terminal.message);
	const deadLetter = await store.findDeadLetterByWorkItem({
		organizationId,
		workItemId: created.data.id,
	});
	if (!deadLetter.ok || !deadLetter.data) {
		throw new Error("Dead letter was not persisted");
	}
	now = new Date("2026-07-28T00:01:00.000Z");
	const replay = await replayDeadLetter(
		{
			organizationId,
			deadLetterId: deadLetter.data.id,
			correlationId: "corr-2",
			idempotencyKey: "work-2",
			requestFingerprint: "fingerprint-2",
		},
		ports,
	);
	const replayAgain = await replayDeadLetter(
		{
			organizationId,
			deadLetterId: deadLetter.data.id,
			correlationId: "corr-2",
			idempotencyKey: "work-2",
			requestFingerprint: "fingerprint-2",
		},
		ports,
	);
	const cursor = await checkpointConnectorCursor(
		{
			organizationId,
			connector: "attendance",
			stream: "events",
			cursor: "cursor-1",
			expectedVersion: null,
		},
		ports,
	);
	const staleCursor = await checkpointConnectorCursor(
		{
			organizationId,
			connector: "attendance",
			stream: "events",
			cursor: "cursor-stale",
			expectedVersion: null,
		},
		ports,
	);
	const wrongTenant = await store.getWorkItem({
		organizationId: "org-other",
		workItemId: created.data.id,
	});
	return {
		organizationId,
		created,
		terminal,
		deadLetter,
		replay,
		replayAgain,
		cursor,
		staleCursor,
		wrongTenant,
	};
}

function assertBulk(result: Awaited<ReturnType<typeof exerciseBulk>>) {
	expect(result.completed).toMatchObject({
		ok: true,
		data: { status: "completed_with_rejections", checkpointVersion: 2 },
	});
	expect(result.replay).toEqual(result.completed);
	expect(result.audit).toMatchObject({ ok: true, data: expect.any(Array) });
	if (result.audit.ok) {
		expect(result.audit.data.map((event) => event.event)).toEqual([
			"BATCH_STARTED",
			"ROW_ACCEPTED",
			"BATCH_CHECKPOINTED",
			"ROW_REJECTED",
			"BATCH_COMPLETED",
		]);
	}
	expect(result.artifact).toMatchObject({
		ok: true,
		data: { checkpointVersion: 2, contentType: "text/csv" },
	});
	if (result.artifact.ok)
		expect(result.artifact.data?.content).toContain("REJECTED");
	expect(result.wrongTenant).toEqual(ok(null));
}

function assertReliability(
	result: Awaited<ReturnType<typeof exerciseReliability>>,
) {
	expect(result.terminal).toMatchObject({
		ok: true,
		data: { status: "dead_lettered", version: 2, attemptCount: 1 },
	});
	expect(result.deadLetter).toMatchObject({
		ok: true,
		data: { errorCode: "VALIDATION_ERROR", replayedByWorkItemId: null },
	});
	expect(result.replay).toMatchObject({
		ok: true,
		data: { status: "pending" },
	});
	expect(result.replayAgain).toEqual(result.replay);
	expect(result.cursor).toMatchObject({ ok: true, data: { version: 1 } });
	expect(result.staleCursor).toMatchObject({ ok: false, code: "CONFLICT" });
	expect(result.wrongTenant).toEqual(ok(null));
}

describe("HR bulk and reliability store parity", () => {
	it("persists bulk artifacts and reliability recovery in Memory", async () => {
		assertBulk(
			await exerciseBulk(createMemoryBulkCheckpointPort<BulkOutput>()),
		);
		assertReliability(
			await exerciseReliability(createMemoryReliabilityStore()),
		);
	});

	describe.runIf(runDrizzleParity)("Drizzle", () => {
		it("matches Memory on live durable state", async () => {
			const bulk = await exerciseBulk(
				createDrizzleBulkCheckpointPort<BulkOutput>(),
			);
			const reliability = await exerciseReliability(
				createDrizzleReliabilityStore(),
			);
			try {
				assertBulk(bulk);
				assertReliability(reliability);
			} finally {
				await db
					.delete(hrBulkImportErrorArtifact)
					.where(
						eq(hrBulkImportErrorArtifact.organizationId, bulk.organizationId),
					);
				await db
					.delete(hrBulkImportAudit)
					.where(eq(hrBulkImportAudit.organizationId, bulk.organizationId));
				await db
					.delete(hrBulkImportCheckpoint)
					.where(
						eq(hrBulkImportCheckpoint.organizationId, bulk.organizationId),
					);
				await db
					.delete(hrReliabilityDeadLetter)
					.where(
						eq(
							hrReliabilityDeadLetter.organizationId,
							reliability.organizationId,
						),
					);
				await db
					.delete(hrConnectorCursor)
					.where(
						eq(hrConnectorCursor.organizationId, reliability.organizationId),
					);
				await db
					.delete(hrReliabilityWorkItem)
					.where(
						eq(
							hrReliabilityWorkItem.organizationId,
							reliability.organizationId,
						),
					);
			}
		});
	});
});
