import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import {
	createMemoryPayrollDeliveryStore,
	deliverPayrollHandoff,
	type PayrollDeliveryPorts,
	type PayrollDeliveryProducerPort,
	payrollDeliveryStatusIsTerminal,
	queuePayrollDelivery,
	recordPayrollDeliveryFeedback,
} from "../src/integrations/payroll-delivery";

const ORGANIZATION_ID = "org-payroll-delivery";
const CORRELATION_ID = "corr-payroll-delivery";
const ACTOR_ID = "actor-payroll-delivery";

function handoff(baseAmount = "85000.00"): ApprovedPayrollHandoff {
	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: ORGANIZATION_ID,
		employeeId: "emp-1",
		employmentId: "employment-1",
		assignment: {
			assignmentId: "assignment-1",
			positionId: "position-1",
		},
		effectiveDate: "2026-01-01",
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
				sourceId: "comp-1",
				sourceVersion: baseAmount === "85000.00" ? 1 : 2,
			},
		],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: {
			compensationVersion: baseAmount === "85000.00" ? 1 : 2,
		},
		approvalEvidence: {
			approvedAt: "2026-01-02T10:00:00.000Z",
			approvedBy: ACTOR_ID,
			correlationId: CORRELATION_ID,
		},
	};
}

function createHarness(
	outcomes: Result<{ receiptId: string | null }>[] = [
		ok({ receiptId: "receipt-1" }),
	],
) {
	const published: Parameters<PayrollDeliveryProducerPort["publish"]>[0][] = [];
	let now = new Date("2026-01-03T00:00:00.000Z");
	const store = createMemoryPayrollDeliveryStore();
	const ports: PayrollDeliveryPorts = {
		store,
		clock: { now: () => new Date(now) },
		producer: {
			async publish(input) {
				published.push(structuredClone(input));
				return outcomes.shift() ?? ok({ receiptId: "receipt-replay" });
			},
		},
	};
	return {
		ports,
		published,
		advance() {
			now = new Date(now.getTime() + 60_000);
		},
	};
}

async function queue(
	ports: PayrollDeliveryPorts,
	input: Partial<Parameters<typeof queuePayrollDelivery>[0]> = {},
) {
	return queuePayrollDelivery(
		{
			organizationId: ORGANIZATION_ID,
			correlationId: CORRELATION_ID,
			idempotencyKey: "idem-delivery-1",
			actorUserId: ACTOR_ID,
			payload: handoff(),
			...input,
		},
		ports,
	);
}

describe("recoverable payroll handoff delivery", () => {
	it("queues an exact-boundary snapshot with deterministic hash and idempotent replay", async () => {
		const { ports } = createHarness();
		const created = await queue(ports);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.data.status).toBe("pending");
		expect(created.data.version).toBe(1);
		expect(created.data.payloadHash).toMatch(/^[a-f0-9]{64}$/);
		const pending = await ports.store.listPending({
			organizationId: ORGANIZATION_ID,
			limit: 10,
		});
		expect(pending.ok && pending.data.map((row) => row.id)).toEqual([
			created.data.id,
		]);

		const replay = await queue(ports);
		expect(replay).toEqual(created);

		const conflict = await queue(ports, { payload: handoff("86000.00") });
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) expect(conflict.code).toBe("CONFLICT");

		const wrongOrganization = await queue(ports, {
			idempotencyKey: "idem-wrong-org",
			organizationId: "org-other",
		});
		expect(wrongOrganization.ok).toBe(false);
		const wrongCorrelation = await queue(ports, {
			idempotencyKey: "idem-wrong-correlation",
			correlationId: "corr-other",
		});
		expect(wrongCorrelation.ok).toBe(false);
	});

	it("retries recoverably and becomes terminal after the bounded attempt limit", async () => {
		const harness = createHarness([
			fail("INTERNAL_ERROR", "transport unavailable"),
			fail("INTERNAL_ERROR", "transport unavailable"),
		]);
		const created = await queue(harness.ports, { maxAttempts: 2 });
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const first = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.data).toMatchObject({ status: "pending", attemptCount: 1 });

		harness.advance();
		const failed = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		expect(failed.ok).toBe(true);
		if (!failed.ok) return;
		expect(failed.data).toMatchObject({ status: "failed", attemptCount: 2 });
		expect(payrollDeliveryStatusIsTerminal(failed.data.status)).toBe(true);

		const terminalReplay = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		expect(terminalReplay).toEqual(failed);
		expect(harness.published).toHaveLength(2);
	});

	it("delivers once and records idempotent acknowledgement feedback", async () => {
		const harness = createHarness();
		const created = await queue(harness.ports);
		if (!created.ok) throw new Error(created.message);
		const delivered = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		expect(delivered.ok).toBe(true);
		if (!delivered.ok) return;
		expect(delivered.data).toMatchObject({
			status: "delivered",
			attemptCount: 1,
			producerReceiptId: "receipt-1",
		});
		expect(harness.published[0]).toMatchObject({
			organizationId: ORGANIZATION_ID,
			correlationId: CORRELATION_ID,
			payloadHash: delivered.data.payloadHash,
		});

		const acknowledged = await recordPayrollDeliveryFeedback(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: "payroll-operator",
				status: "acknowledged",
			},
			harness.ports,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;
		expect(acknowledged.data.status).toBe("acknowledged");
		expect(
			await recordPayrollDeliveryFeedback(
				{
					organizationId: ORGANIZATION_ID,
					deliveryId: created.data.id,
					correlationId: CORRELATION_ID,
					actorUserId: "payroll-operator",
					status: "acknowledged",
				},
				harness.ports,
			),
		).toEqual(acknowledged);
	});

	it("creates one atomic correction supersession after correction-required feedback", async () => {
		const harness = createHarness();
		const created = await queue(harness.ports);
		if (!created.ok) throw new Error(created.message);
		const delivered = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		if (!delivered.ok) throw new Error(delivered.message);
		const feedback = await recordPayrollDeliveryFeedback(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: "payroll-operator",
				status: "correction_required",
				reason: "Correct the approved compensation amount",
			},
			harness.ports,
		);
		expect(feedback.ok).toBe(true);
		if (!feedback.ok) return;

		const correction = await queue(harness.ports, {
			idempotencyKey: "idem-delivery-correction",
			payload: handoff("86000.00"),
			supersedesDeliveryId: created.data.id,
		});
		expect(correction.ok).toBe(true);
		if (!correction.ok) return;
		expect(correction.data).toMatchObject({
			status: "pending",
			supersedesDeliveryId: created.data.id,
		});
		const source = await harness.ports.store.getById({
			organizationId: ORGANIZATION_ID,
			deliveryId: created.data.id,
		});
		expect(source.ok && source.data?.supersededByDeliveryId).toBe(
			correction.data.id,
		);

		const duplicateCorrection = await queue(harness.ports, {
			idempotencyKey: "idem-delivery-second-correction",
			payload: handoff("87000.00"),
			supersedesDeliveryId: created.data.id,
		});
		expect(duplicateCorrection.ok).toBe(false);
	});

	it("records reasoned rejection as terminal feedback", async () => {
		const harness = createHarness();
		const created = await queue(harness.ports);
		if (!created.ok) throw new Error(created.message);
		const delivered = await deliverPayrollHandoff(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: ACTOR_ID,
			},
			harness.ports,
		);
		if (!delivered.ok) throw new Error(delivered.message);
		const rejected = await recordPayrollDeliveryFeedback(
			{
				organizationId: ORGANIZATION_ID,
				deliveryId: created.data.id,
				correlationId: CORRELATION_ID,
				actorUserId: "payroll-operator",
				status: "rejected",
				reason: "Employee mapping is invalid",
			},
			harness.ports,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) return;
		expect(rejected.data).toMatchObject({
			status: "rejected",
			feedbackBy: "payroll-operator",
			feedbackReason: "Employee mapping is invalid",
		});
		expect(payrollDeliveryStatusIsTerminal(rejected.data.status)).toBe(true);
	});

	it("does not disclose a delivery across organization or correlation boundaries", async () => {
		const harness = createHarness();
		const created = await queue(harness.ports);
		if (!created.ok) throw new Error(created.message);
		for (const boundary of [
			{ organizationId: "org-other", correlationId: CORRELATION_ID },
			{ organizationId: ORGANIZATION_ID, correlationId: "corr-other" },
		]) {
			const result = await deliverPayrollHandoff(
				{
					...boundary,
					deliveryId: created.data.id,
					actorUserId: ACTOR_ID,
				},
				harness.ports,
			);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.code).toBe("NOT_FOUND");
		}
		expect(harness.published).toHaveLength(0);
	});
});
