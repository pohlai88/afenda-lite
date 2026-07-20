import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
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
const authorization = {
	async can() {
		return true;
	},
};
const successfulEffects = {
	async emit() {
		return ok(undefined);
	},
};

describe("payments transaction rollback", () => {
	it("rolls back posting when event emission fails", async () => {
		const store = createMemoryPaymentsStore();
		const common = { store, authorization, effects: successfulEffects };
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "PAY-TX-1",
				direction: "transfer",
				currencyCode: "USD",
				amount: "20",
			},
			common,
		);
		if (!created.ok) return;
		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				paymentId: created.data.id,
				expectedVersion: 1,
			},
			{
				...common,
				effects: {
					async emit() {
						return fail("INTERNAL_ERROR", "outbox failed");
					},
				},
			},
		);
		expect(posted.ok).toBe(false);
		const loaded = await getPaymentById(
			{ organizationId, actorUserId, id: created.data.id },
			common,
		);
		expect(loaded.ok && loaded.data?.status).toBe("draft");
		expect(loaded.ok && loaded.data?.version).toBe(1);
	});

	it("rolls back reversal and refund creation when events fail", async () => {
		const store = createMemoryPaymentsStore();
		const common = { store, authorization, effects: successfulEffects };
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				code: "PAY-TX-2",
				direction: "transfer",
				currencyCode: "USD",
				amount: "20",
			},
			common,
		);
		if (!created.ok) return;
		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				paymentId: created.data.id,
				expectedVersion: 1,
			},
			common,
		);
		if (!posted.ok) return;
		const failedEffects = {
			async emit() {
				return fail("INTERNAL_ERROR", "outbox failed");
			},
		};
		const reversed = await reversePayment(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				paymentId: created.data.id,
				expectedVersion: 2,
				reason: "Rejected",
			},
			{ ...common, effects: failedEffects },
		);
		expect(reversed.ok).toBe(false);
		const loaded = await getPaymentById(
			{ organizationId, actorUserId, id: created.data.id },
			common,
		);
		expect(loaded.ok && loaded.data?.status).toBe("posted");
		expect(loaded.ok && loaded.data?.reversal).toBeNull();

		const refund = await postRefund(
			{
				organizationId,
				actorUserId,
				correlationId: "refund",
				code: "REF-TX-1",
				originalPaymentId: created.data.id,
				amount: "5",
			},
			{ ...common, effects: failedEffects },
		);
		expect(refund.ok).toBe(false);
		const refunds = await listPayments(
			{ organizationId, actorUserId, direction: "refund" },
			common,
		);
		expect(refunds.ok && refunds.data).toEqual([]);
	});
});
