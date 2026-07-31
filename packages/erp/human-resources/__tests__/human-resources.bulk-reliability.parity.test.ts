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
import { errorResult } from "@afenda/errors";
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
	claimDueReliabilityWork,
	createMemoryReliabilityStore,
	executeReliabilityWork,
	type ReliabilityKernelPorts,
	type ReliabilityStorePort,
	registerReliabilityWork,
	replayDeadLetter,
} from "../src/reliability";
import { runDrizzleParity } from "./helpers/database-gate";
import { helperAssert as assert } from "./helpers/helper-assert";

interface BulkRow {
	value: string;
}
interface BulkOutput {
	imported: string;
}

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
	if (!first.ok) {
		throw new Error(first.message);
	}
	const completed = await runHumanResourcesBulkImport(
		{
			...request,
			expectedCheckpointVersion: first.data.checkpointVersion ?? undefined,
		},
		ports,
	);
	if (!completed.ok) {
		throw new Error(completed.message);
	}
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

async function exerciseReliability(
	store: ReliabilityStorePort,
	organizationId = `reliability-parity-${crypto.randomUUID()}`,
) {
	let now = new Date("2026-07-28T00:00:00.000Z");
	const ports: ReliabilityKernelPorts = {
		store,
		clock: { now: () => new Date(now) },
		executor: {
			execute: async () =>
				errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Permanent rejection",
				}),
		},
		failureClassifier: { isRetryable: () => false },
	};
	const created = await registerReliabilityWork(
		{
			organizationId,
			connector: "payroll",
			operation: "publish-delivery",
			targetType: "payroll_delivery",
			targetId: "delivery-1",
			correlationId: "corr-1",
			idempotencyKey: "work-1",
			requestFingerprint: "fingerprint-1",
		},
		ports,
	);
	if (!created.ok) {
		throw new Error(created.message);
	}
	const claimed = await claimDueReliabilityWork(
		{
			workerId: "parity-worker",
			now,
			leaseDurationMs: 120_000,
			limit: 25,
			perOrganizationLimit: 5,
		},
		store,
	);
	if (!claimed.ok || claimed.data.length !== 1) {
		throw new Error("Reliability work was not claimed");
	}
	const terminal = await executeReliabilityWork(
		{
			organizationId,
			workItemId: created.data.id,
			leaseOwner: "parity-worker",
		},
		ports,
	);
	if (!terminal.ok) {
		throw new Error(terminal.message);
	}
	const deadLetter = await store.findDeadLetterByWorkItem({
		organizationId,
		workItemId: created.data.id,
	});
	if (!(deadLetter.ok && deadLetter.data)) {
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
	assert.deepInclude(result.completed, {
		ok: true,
		data: { status: "completed_with_rejections", checkpointVersion: 2 },
	});
	assert.deepEqual(result.replay, result.completed);
	assert.deepInclude(result.audit, { ok: true, data: expect.any(Array) });
	if (result.audit.ok) {
		assert.deepEqual(
			result.audit.data.map((event) => event.event),
			[
				"BATCH_STARTED",
				"ROW_ACCEPTED",
				"BATCH_CHECKPOINTED",
				"ROW_REJECTED",
				"BATCH_COMPLETED",
			],
		);
	}
	assert.deepInclude(result.artifact, {
		ok: true,
		data: { checkpointVersion: 2, contentType: "text/csv" },
	});
	if (result.artifact.ok) {
		assert.include(result.artifact.data?.content, "REJECTED");
	}
	assert.deepEqual(result.wrongTenant, errorResult.ok(null));
}

function assertReliability(
	result: Awaited<ReturnType<typeof exerciseReliability>>,
) {
	assert.deepInclude(result.terminal, {
		ok: true,
		data: { status: "dead_lettered", version: 3, attemptCount: 1 },
	});
	assert.deepInclude(result.deadLetter, {
		ok: true,
		data: { errorCode: "VALIDATION_ERROR", replayedByWorkItemId: null },
	});
	assert.deepInclude(result.replay, {
		ok: true,
		data: { status: "pending" },
	});
	assert.deepEqual(result.replayAgain, result.replay);
	assert.deepInclude(result.cursor, { ok: true, data: { version: 1 } });
	assert.deepInclude(result.staleCursor, { ok: false, code: "CONFLICT" });
	assert.deepEqual(result.wrongTenant, errorResult.ok(null));
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
			let reliability:
				| Awaited<ReturnType<typeof exerciseReliability>>
				| undefined;
			const reliabilityOrganizationId = `reliability-parity-${crypto.randomUUID()}`;
			try {
				reliability = await exerciseReliability(
					createDrizzleReliabilityStore(),
					reliabilityOrganizationId,
				);
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
							reliabilityOrganizationId,
						),
					);
				await db
					.delete(hrConnectorCursor)
					.where(
						eq(hrConnectorCursor.organizationId, reliabilityOrganizationId),
					);
				await db
					.delete(hrReliabilityWorkItem)
					.where(
						eq(hrReliabilityWorkItem.organizationId, reliabilityOrganizationId),
					);
			}
		});
	});
});
