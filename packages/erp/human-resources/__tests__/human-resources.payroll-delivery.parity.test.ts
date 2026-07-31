import { db, eq, hrPayrollHandoffDelivery } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { createDrizzlePayrollDeliveryStore } from "../src/adapters/drizzle/payroll-delivery";
import {
	createMemoryPayrollDeliveryStore,
	deliverPayrollHandoff,
	type PayrollDeliveryStorePort,
	queuePayrollDelivery,
	recordPayrollDeliveryFeedback,
} from "../src/integrations/payroll-delivery";
import { runDrizzleParity } from "./helpers/database-gate";

function handoff(
	organizationId: string,
	correlationId: string,
	baseAmount = "5000.00",
): ApprovedPayrollHandoff {
	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId,
		employeeId: "employee-1",
		employmentId: "employment-1",
		assignment: { assignmentId: "assignment-1", positionId: "position-1" },
		effectiveDate: "2026-07-01",
		currencyCode: "USD",
		baseAmount,
		decimalScale: 2,
		roundingMode: "half_even",
		payFrequency: "monthly",
		components: [
			{
				code: "base",
				kind: "base",
				amount: baseAmount,
				currencyCode: "USD",
				decimalScale: 2,
				sourceType: "hr_employee_compensation",
				sourceId: "compensation-1",
				sourceVersion: baseAmount === "5000.00" ? 1 : 2,
			},
		],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: { compensationVersion: baseAmount === "5000.00" ? 1 : 2 },
		approvalEvidence: {
			approvedAt: "2026-07-02T00:00:00.000Z",
			approvedBy: "approver-1",
			correlationId,
		},
	};
}

async function exercise(store: PayrollDeliveryStorePort) {
	const organizationId = `payroll-parity-${crypto.randomUUID()}`;
	const correlationId = `corr-${crypto.randomUUID()}`;
	const ports = {
		store,
		clock: { now: () => new Date("2026-07-03T00:00:00.000Z") },
		producer: {
			publish: async () => errorResult.ok({ receiptId: "receipt-1" }),
		},
	};
	const queued = await queuePayrollDelivery(
		{
			organizationId,
			correlationId,
			idempotencyKey: "delivery-1",
			actorUserId: "actor-1",
			payload: handoff(organizationId, correlationId),
		},
		ports,
	);
	if (!queued.ok) {
		throw new Error(queued.message);
	}
	const replay = await queuePayrollDelivery(
		{
			organizationId,
			correlationId,
			idempotencyKey: "delivery-1",
			actorUserId: "actor-1",
			payload: handoff(organizationId, correlationId),
		},
		ports,
	);
	const delivered = await deliverPayrollHandoff(
		{
			organizationId,
			deliveryId: queued.data.id,
			correlationId,
			actorUserId: "actor-1",
		},
		ports,
	);
	if (!delivered.ok) {
		throw new Error(delivered.message);
	}
	const acknowledged = await recordPayrollDeliveryFeedback(
		{
			organizationId,
			deliveryId: queued.data.id,
			correlationId,
			actorUserId: "payroll-operator",
			status: "acknowledged",
		},
		ports,
	);
	const wrongTenant = await store.getById({
		organizationId: "org-other",
		deliveryId: queued.data.id,
	});
	const correctionSource = await queuePayrollDelivery(
		{
			organizationId,
			correlationId,
			idempotencyKey: "delivery-correction-source",
			actorUserId: "actor-1",
			payload: handoff(organizationId, correlationId),
		},
		ports,
	);
	if (!correctionSource.ok) {
		throw new Error(correctionSource.message);
	}
	const correctionDelivered = await deliverPayrollHandoff(
		{
			organizationId,
			deliveryId: correctionSource.data.id,
			correlationId,
			actorUserId: "actor-1",
		},
		ports,
	);
	if (!correctionDelivered.ok) {
		throw new Error(correctionDelivered.message);
	}
	const correctionRequired = await recordPayrollDeliveryFeedback(
		{
			organizationId,
			deliveryId: correctionSource.data.id,
			correlationId,
			actorUserId: "payroll-operator",
			status: "correction_required",
			reason: "approved source correction",
		},
		ports,
	);
	if (!correctionRequired.ok) {
		throw new Error(correctionRequired.message);
	}
	const correction = await queuePayrollDelivery(
		{
			organizationId,
			correlationId,
			idempotencyKey: "delivery-correction-1",
			actorUserId: "actor-1",
			payload: handoff(organizationId, correlationId, "5100.00"),
			supersedesDeliveryId: correctionSource.data.id,
		},
		ports,
	);
	const linkedSource = await store.getById({
		organizationId,
		deliveryId: correctionSource.data.id,
	});
	return {
		organizationId,
		queued,
		replay,
		delivered,
		acknowledged,
		wrongTenant,
		correction,
		linkedSource,
	};
}

describe("payroll delivery store parity", () => {
	it("preserves idempotency, delivery, feedback, and tenant isolation in memory", async () => {
		const result = await exercise(createMemoryPayrollDeliveryStore());
		expect(result.replay).toEqual(result.queued);
		expect(result.delivered).toMatchObject({
			ok: true,
			data: { status: "delivered", producerReceiptId: "receipt-1" },
		});
		expect(result.acknowledged).toMatchObject({
			ok: true,
			data: { status: "acknowledged" },
		});
		expect(result.wrongTenant).toEqual(errorResult.ok(null));
		expect(result.correction).toMatchObject({
			ok: true,
			data: { status: "pending", supersedesDeliveryId: expect.any(String) },
		});
		if (result.correction.ok) {
			expect(result.linkedSource).toMatchObject({
				ok: true,
				data: { supersededByDeliveryId: result.correction.data.id },
			});
		}
	});

	describe.runIf(runDrizzleParity)("Drizzle", () => {
		it("matches the memory delivery lifecycle on Neon", async () => {
			const result = await exercise(createDrizzlePayrollDeliveryStore());
			try {
				expect(result.replay).toEqual(result.queued);
				expect(result.delivered).toMatchObject({
					ok: true,
					data: { status: "delivered", producerReceiptId: "receipt-1" },
				});
				expect(result.acknowledged).toMatchObject({
					ok: true,
					data: { status: "acknowledged" },
				});
				expect(result.wrongTenant).toEqual(errorResult.ok(null));
				expect(result.correction).toMatchObject({
					ok: true,
					data: { status: "pending", supersedesDeliveryId: expect.any(String) },
				});
				if (result.correction.ok) {
					expect(result.linkedSource).toMatchObject({
						ok: true,
						data: { supersededByDeliveryId: result.correction.data.id },
					});
				}
			} finally {
				await db
					.delete(hrPayrollHandoffDelivery)
					.where(
						eq(hrPayrollHandoffDelivery.organizationId, result.organizationId),
					);
			}
		});
	});
});
