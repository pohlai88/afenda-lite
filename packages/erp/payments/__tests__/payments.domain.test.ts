import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addPaymentAllocation,
	createDraftPayment,
	createMemoryPaymentsStore,
	getPaymentById,
	listPayments,
	postPayment,
	postRefund,
	reversePayment,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
const counterpartyId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const authorization = {
	async can() {
		return true;
	},
};

describe("payments lifecycle", () => {
	it("posts, reverses, and refunds through owned records and versioned events", async () => {
		const events: string[] = [];
		const effects = {
			async emit(event: { type: string }) {
				events.push(event.type);
				return ok(undefined);
			},
		};
		const store = createMemoryPaymentsStore();
		const options = { store, authorization, effects };
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "PAY-1",
				direction: "receipt",
				counterpartyId,
				currencyCode: "usd",
				amount: "100",
			},
			options,
		);
		expect(created.ok && created.data.status).toBe("draft");
		if (!created.ok) return;

		const allocation = await addPaymentAllocation(
			{
				organizationId,
				actorUserId,
				paymentId: created.data.id,
				targetType: "receivable",
				targetId,
				amount: "60",
			},
			options,
		);
		expect(allocation.ok).toBe(true);

		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				paymentId: created.data.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(posted.ok && posted.data.status).toBe("posted");

		const refund = await postRefund(
			{
				organizationId,
				actorUserId,
				correlationId: "refund",
				code: "REF-1",
				originalPaymentId: created.data.id,
				amount: "25",
			},
			options,
		);
		expect(refund.ok && refund.data.direction).toBe("refund");
		expect(refund.ok && refund.data.status).toBe("posted");

		const reversed = await reversePayment(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				paymentId: created.data.id,
				expectedVersion: 3,
				reason: "Bank rejection",
			},
			options,
		);
		expect(reversed.ok && reversed.data.status).toBe("reversed");
		expect(reversed.ok && reversed.data.reversal?.reason).toBe(
			"Bank rejection",
		);

		const loaded = await getPaymentById(
			{ organizationId, actorUserId, id: created.data.id },
			options,
		);
		expect(loaded.ok && loaded.data?.allocations).toHaveLength(1);
		const listed = await listPayments(
			{ organizationId, actorUserId, direction: "refund" },
			options,
		);
		expect(listed.ok && listed.data).toHaveLength(1);
		expect(events).toEqual([
			"payments.payment.created.v1",
			"payments.payment.posted.v1",
			"payments.refund.posted.v1",
			"payments.payment.reversed.v1",
		]);
	});

	it("rejects incompatible and over-value allocations", async () => {
		const options = {
			store: createMemoryPaymentsStore(),
			authorization,
			effects: {
				async emit() {
					return ok(undefined);
				},
			},
		};
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "PAY-2",
				direction: "disbursement",
				counterpartyId,
				currencyCode: "USD",
				amount: "50",
			},
			options,
		);
		if (!created.ok) return;
		const incompatible = await addPaymentAllocation(
			{
				organizationId,
				actorUserId,
				paymentId: created.data.id,
				targetType: "receivable",
				targetId,
				amount: "10",
			},
			options,
		);
		expect(incompatible.ok).toBe(false);
		const excessive = await addPaymentAllocation(
			{
				organizationId,
				actorUserId,
				paymentId: created.data.id,
				targetType: "payable",
				targetId,
				amount: "51",
			},
			options,
		);
		expect(excessive.ok).toBe(false);
	});
});
