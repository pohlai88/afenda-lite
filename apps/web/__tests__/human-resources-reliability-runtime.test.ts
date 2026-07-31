import { errorResult } from "@afenda/errors";
import {
	claimDueReliabilityWork,
	createMemoryReliabilityStore,
	type ReliabilityKernelPorts,
} from "@afenda/human-resources";
import { describe, expect, it, vi } from "vitest";

import {
	checkpointProductionConnectorCursor,
	createReliabilityOperationExecutor,
	processReliabilityWork,
	recoverProductionConnectorCursor,
	registerProductionReliabilityWork,
} from "@/modules/platform/domain/human-resources-reliability-worker";
import {
	createProductionHrObservabilityPorts,
	createProductionHrObservabilityRecorder,
} from "@/modules/platform/observability/human-resources-observability";

const now = new Date("2026-07-28T00:00:00.000Z");

async function claimOne(ports: ReliabilityKernelPorts) {
	return await claimDueReliabilityWork(
		{
			workerId: "worker-1",
			now,
			leaseDurationMs: 120_000,
			limit: 1,
			perOrganizationLimit: 1,
		},
		ports.store,
	);
}

describe("HR reliability runtime composition", () => {
	it("rejects operations that are not composed with a real handler", async () => {
		const executor = createReliabilityOperationExecutor({});
		const result = await executor.execute({
			id: "7c8277b1-e3e8-49a3-84c4-eb74ae35ee84",
			organizationId: "org-1",
			connector: "payroll",
			operation: "publish-delivery",
			targetType: "payroll_delivery",
			targetId: "delivery-1",
			correlationId: "correlation-1",
			idempotencyKey: "work-1",
			requestFingerprint: "fingerprint-1",
			status: "processing",
			version: 1,
			attemptCount: 0,
			nextAttemptAt: new Date("2026-07-28T00:00:00.000Z"),
			lastAttemptAt: null,
			lastErrorCode: null,
			lastErrorMessage: null,
			receiptId: null,
			acknowledgementDeadlineAt: null,
			leaseOwner: "worker-1",
			leaseExpiresAt: new Date("2026-07-28T00:02:00.000Z"),
			createdAt: new Date("2026-07-28T00:00:00.000Z"),
			updatedAt: new Date("2026-07-28T00:00:00.000Z"),
		});
		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
	});

	it("fails closed before persisting an uncomposed production operation", async () => {
		const store = createMemoryReliabilityStore();
		const result = await registerProductionReliabilityWork(
			{
				organizationId: "org-1",
				connector: "bulk",
				operation: "resume-import",
				targetType: "bulk_import_checkpoint",
				targetId: "checkpoint-1",
				correlationId: "correlation-1",
				idempotencyKey: "bulk-1",
				requestFingerprint: "fingerprint-1",
			},
			{ store, clock: { now: () => now } },
		);
		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(
			await store.findByIdempotencyKey({
				organizationId: "org-1",
				connector: "bulk",
				idempotencyKey: "bulk-1",
			}),
		).toEqual(errorResult.ok(null));
	});

	it("persists retry state and emits only bounded failure vocabulary", async () => {
		const store = createMemoryReliabilityStore();
		const telemetry: Array<{ level: string; event: string; code: string }> = [];
		const observability = createProductionHrObservabilityPorts(
			createProductionHrObservabilityRecorder({
				write: (entry) => telemetry.push(entry),
			}),
		);
		const ports: ReliabilityKernelPorts = {
			store,
			clock: { now: () => now },
			executor: {
				execute: async () => errorResult.fail("SERVICE_UNAVAILABLE"),
			},
			failureClassifier: { isRetryable: () => true },
		};
		const registered = await registerProductionReliabilityWork(
			{
				organizationId: "org-1",
				connector: "payroll",
				operation: "publish-delivery",
				targetType: "payroll_delivery",
				targetId: "delivery-sensitive-123",
				correlationId: "correlation-sensitive-123",
				idempotencyKey: "employee-sensitive-123",
				requestFingerprint: "fingerprint-sensitive-123",
			},
			ports,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			return;
		}
		expect(await claimOne(ports)).toMatchObject({ ok: true });

		const processed = await processReliabilityWork(
			{
				organizationId: "org-1",
				workItemId: registered.data.id,
				leaseOwner: "worker-1",
			},
			ports,
			observability,
		);
		expect(processed).toMatchObject({
			ok: true,
			data: {
				status: "pending",
				attemptCount: 1,
				lastErrorCode: "SERVICE_UNAVAILABLE",
			},
		});
		expect(telemetry.map((entry) => entry.event)).toEqual(
			expect.arrayContaining([
				"hr.command.failed",
				"hr.event.failed",
				"hr.payroll_delivery.failed",
			]),
		);
		const serialized = JSON.stringify(telemetry);
		expect(serialized).not.toContain("sensitive@example.com");
		expect(serialized).not.toContain("employee-sensitive-123");
		expect(serialized).not.toContain("correlation-sensitive-123");
	});

	it("derives unhealthy connector telemetry from persisted execution outcomes", async () => {
		const store = createMemoryReliabilityStore();
		const execute = vi.fn(async () => errorResult.fail("SERVICE_UNAVAILABLE"));
		const telemetry: Array<{ level: string; event: string; code: string }> = [];
		const observability = createProductionHrObservabilityPorts(
			createProductionHrObservabilityRecorder({
				write: (entry) => telemetry.push(entry),
			}),
		);
		const ports: ReliabilityKernelPorts = {
			store,
			clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
			executor: { execute },
			failureClassifier: { isRetryable: () => true },
		};
		const registered = await registerProductionReliabilityWork(
			{
				organizationId: "org-1",
				connector: "attendance",
				operation: "pull-events",
				targetType: "connector_stream",
				targetId: "clock-events",
				correlationId: "correlation-1",
				idempotencyKey: "attendance-1",
				requestFingerprint: "fingerprint-1",
			},
			ports,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			return;
		}
		expect(await claimOne(ports)).toMatchObject({ ok: true });
		const result = await processReliabilityWork(
			{
				organizationId: "org-1",
				workItemId: registered.data.id,
				leaseOwner: "worker-1",
			},
			ports,
			observability,
		);
		expect(result).toMatchObject({ ok: true, data: { status: "pending" } });
		expect(execute).toHaveBeenCalledTimes(1);
		expect(telemetry.map((entry) => entry.event)).toEqual(
			expect.arrayContaining(["hr.connector.unhealthy", "hr.command.failed"]),
		);
		expect(JSON.stringify(telemetry)).not.toContain("clock-events");
	});

	it("marks work succeeded only after a connector acknowledgement", async () => {
		const store = createMemoryReliabilityStore();
		const execute = vi.fn(async () =>
			errorResult.ok({
				kind: "acknowledged" as const,
				receiptId: "receipt-acknowledged",
			}),
		);
		const ports: ReliabilityKernelPorts = {
			store,
			clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
			executor: { execute },
			failureClassifier: { isRetryable: () => true },
		};
		const registered = await registerProductionReliabilityWork(
			{
				organizationId: "org-1",
				connector: "payroll",
				operation: "publish-delivery",
				targetType: "payroll_delivery",
				targetId: "delivery-1",
				correlationId: "correlation-1",
				idempotencyKey: "idempotency-1",
				requestFingerprint: "fingerprint-1",
			},
			ports,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			return;
		}
		expect(await claimOne(ports)).toMatchObject({ ok: true });
		const processed = await processReliabilityWork(
			{
				organizationId: "org-1",
				workItemId: registered.data.id,
				leaseOwner: "worker-1",
			},
			ports,
		);
		expect(processed).toMatchObject({
			ok: true,
			data: { status: "succeeded" },
		});
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it("composes durable connector cursor recovery and CAS checkpointing", async () => {
		const store = createMemoryReliabilityStore();
		const ports = {
			store,
			clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
		};
		const checkpoint = await checkpointProductionConnectorCursor(
			{
				organizationId: "org-1",
				connector: "benefits",
				stream: "enrollments",
				cursor: "cursor-1",
				expectedVersion: null,
			},
			ports,
		);
		expect(checkpoint).toMatchObject({ ok: true, data: { version: 1 } });
		expect(
			await recoverProductionConnectorCursor(
				{
					organizationId: "org-1",
					connector: "benefits",
					stream: "enrollments",
				},
				store,
			),
		).toMatchObject({ ok: true, data: { cursor: "cursor-1", version: 1 } });
	});

	it("fails closed before writing unsafe telemetry labels", () => {
		const write = vi.fn();
		const recorder = createProductionHrObservabilityRecorder({ write });
		expect(() =>
			recorder.recordMetric({
				name: "hr.command.total",
				kind: "counter",
				value: 1,
				labels: { userId: "employee-1", outcome: "failure" },
			} as never),
		).toThrow("cannot contain identifiers or PII");
		expect(write).not.toHaveBeenCalled();
	});
});
