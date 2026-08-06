import { randomUUID } from "node:crypto";

import { PAYROLL_RUN_FINALIZED_EVENT } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { createMemoryPayrollStore } from "../../src/testing/index";
import { createMemoryMutationPorts } from "../helpers/memory-ports";
import {
	cleanupPayrollNeonTestData,
	countPayrollAuditFacts,
	countPayrollOutboxEvents,
	seedConflictingPayrollOutboxEvent,
} from "../helpers/payroll-neon-cleanup";
import {
	PAYROLL_NEON_PARITY_SKIP_REASON,
	RUN_PAYROLL_NEON_PARITY,
} from "../helpers/payroll-neon-parity";
import {
	createPayrollParityHarness,
	seedDraftRun,
} from "../helpers/payroll-store-parity-harness";

const EMPTY_FINALIZATION_PROJECTION = {
	paymentDate: "2025-01-31",
	postingDate: "2025-01-31",
	payments: [],
	postingLines: [],
	totals: [],
} as const;

async function seedCalculatedRun(
	harness: ReturnType<typeof createPayrollParityHarness>,
) {
	const seeded = await seedDraftRun(harness);
	const calculating = await harness.store.updateRunWithVersion(
		{
			organizationId: harness.organizationId,
			runId: seeded.run.id,
			status: "calculating",
			expectedVersion: seeded.run.version,
			actorUserId: harness.actorUserId,
			correlationId: `corr-fi-calculating-${harness.adapter}`,
		},
		harness.ports,
	);
	if (!calculating.ok) {
		throw new Error(calculating.message);
	}
	const calculated = await harness.store.updateRunWithVersion(
		{
			organizationId: harness.organizationId,
			runId: seeded.run.id,
			status: "calculated",
			calculationSnapshotHash: "hash-fi-finalize",
			calculationVersion: "payroll.calc.v1",
			roundingPolicyJson: { mode: "half_even", scale: 2 },
			expectedVersion: calculating.data.version,
			actorUserId: harness.actorUserId,
			correlationId: `corr-fi-calculated-${harness.adapter}`,
		},
		harness.ports,
	);
	if (!calculated.ok) {
		throw new Error(calculated.message);
	}
	return calculated.data;
}

describe.skipIf(!RUN_PAYROLL_NEON_PARITY)(
	`payroll finalize atomicity (${PAYROLL_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back run status, audit, and outbox when outbox insert conflicts", async () => {
			const harness = createPayrollParityHarness("drizzle");
			try {
				const calculated = await seedCalculatedRun(harness);
				const nextVersion = calculated.version + 1;
				const dedupeKey = `${calculated.id}:finalized:${nextVersion}:1`;
				const beforeOutbox = await countPayrollOutboxEvents(
					harness.organizationId,
				);
				const beforeAudit = await countPayrollAuditFacts(
					harness.organizationId,
				);

				await seedConflictingPayrollOutboxEvent({
					organizationId: harness.organizationId,
					actorUserId: harness.actorUserId,
					correlationId: `corr-fi-outbox-conflict-${randomUUID()}`,
					eventType: PAYROLL_RUN_FINALIZED_EVENT,
					deduplicationKey: dedupeKey,
				});

				const result = await harness.store.updateRunWithVersion(
					{
						organizationId: harness.organizationId,
						runId: calculated.id,
						status: "finalized",
						finalizedAt: new Date().toISOString(),
						finalizedBy: harness.actorUserId,
						finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
						expectedVersion: calculated.version,
						actorUserId: harness.actorUserId,
						correlationId: `corr-fi-finalize-conflict-${harness.adapter}`,
					},
					harness.ports,
				);

				expect(result.ok).toBe(false);

				const reloaded = await harness.store.getRun({
					organizationId: harness.organizationId,
					runId: calculated.id,
				});
				expect(reloaded.ok).toBe(true);
				if (!reloaded.ok) {
					return;
				}
				expect(reloaded.data?.status).toBe("calculated");
				expect(reloaded.data?.version).toBe(calculated.version);
				await expect(
					countPayrollOutboxEvents(harness.organizationId),
				).resolves.toBe(beforeOutbox + 1);
				await expect(
					countPayrollAuditFacts(harness.organizationId),
				).resolves.toBe(beforeAudit);
			} finally {
				await cleanupPayrollNeonTestData(harness.organizationId);
			}
		});

		it("allows exactly one concurrent finalize winner on Neon", async () => {
			const harness = createPayrollParityHarness("drizzle");
			try {
				const calculated = await seedCalculatedRun(harness);
				const finalizeInput = {
					organizationId: harness.organizationId,
					runId: calculated.id,
					status: "finalized" as const,
					finalizedAt: new Date().toISOString(),
					finalizedBy: harness.actorUserId,
					finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
					expectedVersion: calculated.version,
					actorUserId: harness.actorUserId,
					correlationId: `corr-fi-concurrent-finalize-${harness.adapter}`,
				};
				const [first, second] = await Promise.all([
					harness.store.updateRunWithVersion(finalizeInput, harness.ports),
					harness.store.updateRunWithVersion(finalizeInput, harness.ports),
				]);
				const successes = [first, second].filter((result) => result.ok);
				const failures = [first, second].filter((result) => !result.ok);
				expect(successes).toHaveLength(1);
				expect(failures).toHaveLength(1);

				const reloaded = await harness.store.getRun({
					organizationId: harness.organizationId,
					runId: calculated.id,
				});
				expect(reloaded.ok).toBe(true);
				if (!reloaded.ok) {
					return;
				}
				expect(reloaded.data?.status).toBe("finalized");
			} finally {
				await cleanupPayrollNeonTestData(harness.organizationId);
			}
		});

		it("idempotent re-finalize does not emit a second payment-request outbox row", async () => {
			const harness = createPayrollParityHarness("drizzle");
			try {
				const calculated = await seedCalculatedRun(harness);
				const first = await harness.store.updateRunWithVersion(
					{
						organizationId: harness.organizationId,
						runId: calculated.id,
						status: "finalized",
						finalizedAt: new Date().toISOString(),
						finalizedBy: harness.actorUserId,
						finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
						expectedVersion: calculated.version,
						actorUserId: harness.actorUserId,
						correlationId: `corr-fi-finalize-once-${harness.adapter}`,
					},
					harness.ports,
				);
				expect(first.ok).toBe(true);
				if (!first.ok) {
					return;
				}
				const outboxAfterFirst = await countPayrollOutboxEvents(
					harness.organizationId,
				);

				const second = await harness.store.updateRunWithVersion(
					{
						organizationId: harness.organizationId,
						runId: calculated.id,
						status: "finalized",
						finalizedAt: first.data.finalizedAt,
						finalizedBy: first.data.finalizedBy,
						finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
						expectedVersion: first.data.version,
						actorUserId: harness.actorUserId,
						correlationId: `corr-fi-finalize-redeliver-${harness.adapter}`,
					},
					harness.ports,
				);
				expect(second.ok).toBe(false);
				await expect(
					countPayrollOutboxEvents(harness.organizationId),
				).resolves.toBe(outboxAfterFirst);
			} finally {
				await cleanupPayrollNeonTestData(harness.organizationId);
			}
		});
	},
);

describe("payroll finalize memory failure injection", () => {
	it("rolls back run mutation when outbox append fails", async () => {
		const store = createMemoryPayrollStore();
		const ports = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const organizationId = `org-mem-fi-${randomUUID()}`;
		const actorUserId = "user-mem-fi";

		const calendar = await store.createCalendar(
			{
				organizationId,
				code: "CAL-MEM-FI",
				name: "Memory FI calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				effectiveTo: null,
				idempotencyKey: "idem-cal-mem-fi",
				createRequestFingerprint: "fp-cal-mem-fi",
				createdBy: actorUserId,
				correlationId: "corr-cal-mem-fi",
			},
			ports,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) {
			return;
		}
		const payGroup = await store.createPayGroup(
			{
				organizationId,
				calendarId: calendar.data.id,
				code: "PG-MEM-FI",
				name: "Memory FI pay group",
				currencyCode: "USD",
				idempotencyKey: "idem-pg-mem-fi",
				createRequestFingerprint: "fp-pg-mem-fi",
				createdBy: actorUserId,
				correlationId: "corr-pg-mem-fi",
			},
			ports,
		);
		expect(payGroup.ok).toBe(true);
		if (!payGroup.ok) {
			return;
		}
		const period = await store.createPeriod(
			{
				organizationId,
				payGroupId: payGroup.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-mem-fi",
				createRequestFingerprint: "fp-period-mem-fi",
				createdBy: actorUserId,
				correlationId: "corr-period-mem-fi",
			},
			ports,
		);
		expect(period.ok).toBe(true);
		if (!period.ok) {
			return;
		}
		const run = await store.createRun(
			{
				organizationId,
				payGroupId: payGroup.data.id,
				periodId: period.data.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-mem-fi",
				createRequestFingerprint: "fp-run-mem-fi",
				createdBy: actorUserId,
				correlationId: "corr-run-mem-fi",
			},
			createMemoryMutationPorts(),
		);
		expect(run.ok).toBe(true);
		if (!run.ok) {
			return;
		}
		const calculating = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "calculating",
				expectedVersion: run.data.version,
				actorUserId,
				correlationId: "corr-calc-ing-mem-fi",
			},
			createMemoryMutationPorts(),
		);
		expect(calculating.ok).toBe(true);
		if (!calculating.ok) {
			return;
		}
		const calculated = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "calculated",
				calculationSnapshotHash: "hash-mem-fi",
				calculationVersion: "payroll.calc.v1",
				expectedVersion: calculating.data.version,
				actorUserId,
				correlationId: "corr-calculated-mem-fi",
			},
			createMemoryMutationPorts(),
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const failingPorts = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const finalized = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "finalized",
				finalizedAt: new Date().toISOString(),
				finalizedBy: actorUserId,
				finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
				expectedVersion: calculated.data.version,
				actorUserId,
				correlationId: "corr-finalize-mem-fi",
			},
			failingPorts,
		);
		expect(finalized.ok).toBe(false);

		const reloaded = await store.getRun({
			organizationId,
			runId: run.data.id,
		});
		expect(reloaded.ok).toBe(true);
		if (!reloaded.ok) {
			return;
		}
		expect(reloaded.data?.status).toBe("calculated");
		expect(reloaded.data?.version).toBe(calculated.data.version);
		// Transaction seam clears outbox call buffers on failure; status rollback is the proof.
		expect(failingPorts.outbox.calls).toHaveLength(0);
	});

	it("rolls back run mutation when audit record fails", async () => {
		const store = createMemoryPayrollStore();
		const organizationId = `org-mem-audit-fi-${randomUUID()}`;
		const actorUserId = "user-mem-audit-fi";
		const okPorts = createMemoryMutationPorts();

		const calendar = await store.createCalendar(
			{
				organizationId,
				code: "CAL-MEM-AUDIT",
				name: "Memory audit FI calendar",
				timezone: "UTC",
				effectiveFrom: "2025-01-01",
				effectiveTo: null,
				idempotencyKey: "idem-cal-mem-audit",
				createRequestFingerprint: "fp-cal-mem-audit",
				createdBy: actorUserId,
				correlationId: "corr-cal-mem-audit",
			},
			okPorts,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) {
			return;
		}
		const payGroup = await store.createPayGroup(
			{
				organizationId,
				calendarId: calendar.data.id,
				code: "PG-MEM-AUDIT",
				name: "Memory audit FI pay group",
				currencyCode: "USD",
				idempotencyKey: "idem-pg-mem-audit",
				createRequestFingerprint: "fp-pg-mem-audit",
				createdBy: actorUserId,
				correlationId: "corr-pg-mem-audit",
			},
			okPorts,
		);
		expect(payGroup.ok).toBe(true);
		if (!payGroup.ok) {
			return;
		}
		const period = await store.createPeriod(
			{
				organizationId,
				payGroupId: payGroup.data.id,
				periodStart: "2025-01-01",
				periodEnd: "2025-01-31",
				cutoffDate: "2025-01-28",
				idempotencyKey: "idem-period-mem-audit",
				createRequestFingerprint: "fp-period-mem-audit",
				createdBy: actorUserId,
				correlationId: "corr-period-mem-audit",
			},
			okPorts,
		);
		expect(period.ok).toBe(true);
		if (!period.ok) {
			return;
		}
		const run = await store.createRun(
			{
				organizationId,
				payGroupId: payGroup.data.id,
				periodId: period.data.id,
				runType: "regular",
				sequence: 1,
				idempotencyKey: "idem-run-mem-audit",
				createRequestFingerprint: "fp-run-mem-audit",
				createdBy: actorUserId,
				correlationId: "corr-run-mem-audit",
			},
			okPorts,
		);
		expect(run.ok).toBe(true);
		if (!run.ok) {
			return;
		}
		const calculating = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "calculating",
				expectedVersion: run.data.version,
				actorUserId,
				correlationId: "corr-calc-ing-mem-audit",
			},
			okPorts,
		);
		expect(calculating.ok).toBe(true);
		if (!calculating.ok) {
			return;
		}
		const calculated = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "calculated",
				calculationSnapshotHash: "hash-mem-audit",
				calculationVersion: "payroll.calc.v1",
				expectedVersion: calculating.data.version,
				actorUserId,
				correlationId: "corr-calculated-mem-audit",
			},
			okPorts,
		);
		expect(calculated.ok).toBe(true);
		if (!calculated.ok) {
			return;
		}

		const failingPorts = createMemoryMutationPorts({ auditFailAfter: 0 });
		const finalized = await store.updateRunWithVersion(
			{
				organizationId,
				runId: run.data.id,
				status: "finalized",
				finalizedAt: new Date().toISOString(),
				finalizedBy: actorUserId,
				finalizationProjection: EMPTY_FINALIZATION_PROJECTION,
				expectedVersion: calculated.data.version,
				actorUserId,
				correlationId: "corr-finalize-mem-audit",
			},
			failingPorts,
		);
		expect(finalized.ok).toBe(false);

		const reloaded = await store.getRun({
			organizationId,
			runId: run.data.id,
		});
		expect(reloaded.ok).toBe(true);
		if (!reloaded.ok) {
			return;
		}
		expect(reloaded.data?.status).toBe("calculated");
	});
});
