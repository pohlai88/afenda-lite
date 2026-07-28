import { fail, ok, type Result } from "@afenda/errors/result";
import type { DomainEvent } from "@afenda/events";
import {
	createMemoryReliabilityStore,
	type ReliabilityKernelPorts,
} from "@afenda/human-resources";
import { describe, expect, it, vi } from "vitest";

import {
	checkpointProductionConnectorCursor,
	createReliabilityEventExecutor,
	processReliabilityWork,
	recoverProductionConnectorCursor,
	registerProductionReliabilityWork,
} from "@/modules/platform/domain/human-resources-reliability-worker";
import {
	createProductionHrObservabilityPorts,
	createProductionHrObservabilityRecorder,
} from "@/modules/platform/observability/human-resources-observability";

function event(organizationId: string): DomainEvent {
	return {
		id: "event-1",
		type: "platform.human-resources.reliability-work.requested.v1",
		sourceModule: "platform",
		deduplicationKey: "reliability:work:fingerprint",
		correlationId: "correlation-1",
		causationId: "work-1",
		organizationId,
		actorUserId: "operator-1",
		payload: {},
		metadata: null,
		status: "pending",
		attempts: 0,
		lastError: null,
		processedAt: null,
		occurredAt: new Date("2026-07-28T00:00:00.000Z"),
	};
}

describe("HR reliability runtime composition", () => {
	it("rejects cross-tenant event execution evidence", async () => {
		const publish = vi.fn(
			async (_input: unknown): Promise<Result<DomainEvent>> =>
				ok(event("org-other")),
		);
		const executor = createReliabilityEventExecutor({ publish }, "operator-1");
		const result = await executor.execute({
			id: "7c8277b1-e3e8-49a3-84c4-eb74ae35ee84",
			organizationId: "org-1",
			connector: "payroll",
			operation: "publish",
			correlationId: "correlation-1",
			idempotencyKey: "work-1",
			requestFingerprint: "fingerprint-1",
			status: "pending",
			version: 1,
			attemptCount: 0,
			nextAttemptAt: new Date("2026-07-28T00:00:00.000Z"),
			lastAttemptAt: null,
			lastErrorCode: null,
			lastErrorMessage: null,
			receiptId: null,
			createdAt: new Date("2026-07-28T00:00:00.000Z"),
			updatedAt: new Date("2026-07-28T00:00:00.000Z"),
		});
		expect(result).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
	});

	it("persists retry state and emits only bounded failure vocabulary", async () => {
		const now = new Date("2026-07-28T00:00:00.000Z");
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
				execute: async () =>
					fail("SERVICE_UNAVAILABLE", "sensitive@example.com"),
			},
			failureClassifier: { isRetryable: () => true },
		};
		const registered = await registerProductionReliabilityWork(
			{
				organizationId: "org-1",
				connector: "payroll",
				operation: "privacy.bulk.authorization",
				correlationId: "correlation-sensitive-123",
				idempotencyKey: "employee-sensitive-123",
				requestFingerprint: "fingerprint-sensitive-123",
			},
			ports,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;

		const processed = await processReliabilityWork(
			{ organizationId: "org-1", workItemId: registered.data.id },
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
				"hr.authorization.denied",
				"hr.privacy.operation.failed",
				"hr.bulk.failed",
				"hr.payroll_delivery.failed",
			]),
		);
		const serialized = JSON.stringify(telemetry);
		expect(serialized).not.toContain("sensitive@example.com");
		expect(serialized).not.toContain("employee-sensitive-123");
		expect(serialized).not.toContain("correlation-sensitive-123");
	});

	it("pauses work for required outages and records bounded connector health", async () => {
		const store = createMemoryReliabilityStore();
		const execute = vi.fn(async () => ok({ receiptId: "receipt-1" }));
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
		const result = await processReliabilityWork(
			{
				organizationId: "org-1",
				workItemId: "not-loaded-during-outage",
				dependencies: [
					{ name: "payroll", required: true, health: "unavailable" },
				],
			},
			ports,
			observability,
		);
		expect(result).toMatchObject({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
		});
		expect(execute).not.toHaveBeenCalled();
		expect(telemetry.map((entry) => entry.event)).toEqual(
			expect.arrayContaining(["hr.connector.unhealthy", "hr.command.failed"]),
		);
		expect(JSON.stringify(telemetry)).not.toContain("not-loaded-during-outage");
	});

	it("continues in degraded mode when only optional dependencies are down", async () => {
		const store = createMemoryReliabilityStore();
		const execute = vi.fn(async () => ok({ receiptId: "receipt-degraded" }));
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
				operation: "publish",
				correlationId: "correlation-1",
				idempotencyKey: "idempotency-1",
				requestFingerprint: "fingerprint-1",
			},
			ports,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) return;
		const processed = await processReliabilityWork(
			{
				organizationId: "org-1",
				workItemId: registered.data.id,
				dependencies: [{ name: "search", required: false, health: "degraded" }],
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
