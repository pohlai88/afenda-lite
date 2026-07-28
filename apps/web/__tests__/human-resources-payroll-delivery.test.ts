import { ok } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";
import {
	createMemoryPayrollDeliveryStore,
	type PayrollDeliveryPorts,
	queuePayrollDelivery,
} from "@afenda/human-resources";
import { describe, expect, it, vi } from "vitest";

import {
	createPayrollDeliveryEventProducer,
	recordPayrollDeliveryFeedback,
	recoverPendingPayrollDeliveries,
} from "@/modules/platform/domain/human-resources-payroll-delivery";
import {
	createProductionHrObservabilityPorts,
	createProductionHrObservabilityRecorder,
} from "@/modules/platform/observability/human-resources-observability";

function handoff(): ApprovedPayrollHandoff {
	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: "org-1",
		employeeId: "employee-1",
		employmentId: "employment-1",
		assignment: { assignmentId: "assignment-1", positionId: "position-1" },
		effectiveDate: "2026-07-01",
		currencyCode: "MYR",
		baseAmount: "8500.00",
		decimalScale: 2,
		roundingMode: "half_even",
		payFrequency: "monthly",
		components: [],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: { compensationVersion: 1 },
		approvalEvidence: {
			approvedAt: "2026-07-02T00:00:00.000Z",
			approvedBy: "approver-1",
			correlationId: "correlation-1",
		},
	};
}

function eventResult(
	command: Parameters<
		ReturnType<typeof createPayrollDeliveryEventProducer>["publish"]
	>[0],
) {
	return ok({
		id: "event-1",
		type: "platform.human-resources.payroll-delivery.requested.v1" as const,
		sourceModule: "platform" as const,
		deduplicationKey: `payroll-delivery:${command.deliveryId}:${command.payloadHash}`,
		correlationId: command.correlationId,
		causationId: command.deliveryId,
		organizationId: command.organizationId,
		actorUserId: "operator-1",
		payload: command,
		metadata: null,
		status: "pending" as const,
		attempts: 0,
		lastError: null,
		processedAt: null,
		occurredAt: new Date("2026-07-03T00:00:00.000Z"),
		createdAt: new Date("2026-07-03T00:00:00.000Z"),
	});
}

describe("HR payroll delivery production composition", () => {
	it("publishes the versioned platform integration event with replay-safe identity", async () => {
		const publish = vi.fn(async (command) => eventResult(command.payload));
		const producer = createPayrollDeliveryEventProducer(
			{ publish },
			"operator-1",
		);
		const payload = handoff();
		const result = await producer.publish({
			deliveryId: "7c8277b1-e3e8-49a3-84c4-eb74ae35ee84",
			organizationId: "org-1",
			correlationId: "correlation-1",
			payloadHash: "a".repeat(64),
			payload,
			attempt: 1,
		});

		expect(result).toEqual({ ok: true, data: { receiptId: "event-1" } });
		expect(publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "platform.human-resources.payroll-delivery.requested.v1",
				sourceModule: "platform",
				actorUserId: "operator-1",
				deduplicationKey:
					"payroll-delivery:7c8277b1-e3e8-49a3-84c4-eb74ae35ee84:" +
					"a".repeat(64),
				organizationId: "org-1",
			}),
		);
	});

	it("records a bounded payroll failure when the event boundary is unavailable", async () => {
		const telemetry: Array<{ level: string; event: string; code: string }> = [];
		const producer = createPayrollDeliveryEventProducer(
			{
				publish: async () => ({
					ok: false,
					code: "SERVICE_UNAVAILABLE",
					message: "upstream payload contained employee@example.com",
				}),
			},
			"operator-1",
			createProductionHrObservabilityPorts(
				createProductionHrObservabilityRecorder({
					write: (entry) => telemetry.push(entry),
				}),
			),
		);
		const result = await producer.publish({
			deliveryId: "7c8277b1-e3e8-49a3-84c4-eb74ae35ee84",
			organizationId: "org-1",
			correlationId: "correlation-1",
			payloadHash: "a".repeat(64),
			payload: handoff(),
			attempt: 1,
		});
		expect(result).toMatchObject({ ok: false, code: "SERVICE_UNAVAILABLE" });
		expect(telemetry.map((entry) => entry.event)).toEqual([
			"metric.hr.payroll_delivery.failure.total",
			"hr.payroll_delivery.failed",
		]);
		expect(JSON.stringify(telemetry)).not.toContain("employee@example.com");
	});

	it("recovers queued work through the producer and resolves feedback using stored correlation", async () => {
		const store = createMemoryPayrollDeliveryStore();
		const publish = vi.fn(async (command) => eventResult(command.payload));
		const ports: PayrollDeliveryPorts = {
			store,
			producer: createPayrollDeliveryEventProducer({ publish }, "operator-1"),
			clock: { now: () => new Date("2026-07-03T00:00:00.000Z") },
		};
		const queued = await queuePayrollDelivery(
			{
				organizationId: "org-1",
				correlationId: "correlation-1",
				idempotencyKey: "delivery-1",
				actorUserId: "operator-1",
				payload: handoff(),
			},
			ports,
		);
		expect(queued.ok).toBe(true);
		if (!queued.ok) return;

		const recovered = await recoverPendingPayrollDeliveries(
			{
				organizationId: "org-1",
				actorUserId: "operator-1",
				correlationId: "recovery-run-1",
				limit: 25,
			},
			ports,
		);
		expect(recovered).toMatchObject({
			ok: true,
			data: [
				{
					id: queued.data.id,
					status: "delivered",
					producerReceiptId: "event-1",
				},
			],
		});

		const feedback = await recordPayrollDeliveryFeedback(
			{
				organizationId: "org-1",
				deliveryId: queued.data.id,
				actorUserId: "payroll-operator-1",
				status: "acknowledged",
			},
			ports,
		);
		expect(feedback).toMatchObject({
			ok: true,
			data: { status: "acknowledged", feedbackBy: "payroll-operator-1" },
		});
	});
});
