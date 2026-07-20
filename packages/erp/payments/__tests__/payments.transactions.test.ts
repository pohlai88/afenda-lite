import { describe, expect, it } from "vitest";

import {
	createAndPostPaymentTransfer,
	createDraftPayment,
	createPaymentAccount,
	getPaymentById,
	postPayment,
	postRefund,
	reversePayment,
} from "../src/index";
import { createMemoryPaymentsStore } from "../src/testing";
import { reconcilePayments } from "../src/reconcile";

const organizationId = "org-1";
const actorUserId = "user-1";
const authorization = {
	async can() {
		return true;
	},
};

describe("payments domain conflicts", () => {
	it("rejects version conflicts on post and reverse", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "account",
				idempotencyKey: "account-1",
				code: "CASH-1",
				name: "Cash",
				currencyCode: "USD",
			},
			options,
		);
		if (!account.ok) return;

		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-tx-1",
				code: "PAY-TX-1",
				paymentAccountId: account.data.id,
				direction: "receipt",
				purpose: "manual_receipt",
				currencyCode: "USD",
				amount: "20",
			},
			options,
		);
		if (!created.ok) return;

		const stalePost = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-stale",
				paymentId: created.data.id,
				expectedVersion: 99,
			},
			options,
		);
		expect(stalePost.ok).toBe(false);

		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-ok",
				paymentId: created.data.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) return;

		const staleReverse = await reversePayment(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				idempotencyKey: "reverse-stale",
				paymentId: created.data.id,
				expectedVersion: 1,
				reason: "Rejected",
			},
			options,
		);
		expect(staleReverse.ok).toBe(false);

		const loaded = await getPaymentById(
			{ organizationId, actorUserId, id: created.data.id },
			options,
		);
		expect(loaded.ok && loaded.data?.status).toBe("posted");
	});

	it("rejects refunds that exceed the remaining refundable amount", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "account",
				idempotencyKey: "account-2",
				code: "CASH-2",
				name: "Cash",
				currencyCode: "USD",
			},
			options,
		);
		if (!account.ok) return;
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-tx-2",
				code: "PAY-TX-2",
				paymentAccountId: account.data.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId: "00000000-0000-4000-8000-000000000001",
				currencyCode: "USD",
				amount: "20",
			},
			options,
		);
		if (!created.ok) return;
		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-2",
				paymentId: created.data.id,
				expectedVersion: 1,
			},
			options,
		);
		if (!posted.ok) return;

		const first = await postRefund(
			{
				organizationId,
				actorUserId,
				correlationId: "refund-1",
				idempotencyKey: "refund-1",
				code: "REF-1",
				originalPaymentId: created.data.id,
				paymentAccountId: account.data.id,
				refundSource: "customer_payment",
				amount: "15",
			},
			options,
		);
		expect(first.ok).toBe(true);

		const excessive = await postRefund(
			{
				organizationId,
				actorUserId,
				correlationId: "refund-2",
				idempotencyKey: "refund-2",
				code: "REF-2",
				originalPaymentId: created.data.id,
				paymentAccountId: account.data.id,
				refundSource: "customer_payment",
				amount: "10",
			},
			options,
		);
		expect(excessive.ok).toBe(false);
	});

	it("reconciles paired transfers as consistent", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const from = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "from",
				idempotencyKey: "from",
				code: "OUT",
				name: "Out",
				kind: "bank",
				currencyCode: "USD",
			},
			options,
		);
		const to = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "to",
				idempotencyKey: "to",
				code: "IN",
				name: "In",
				kind: "bank",
				currencyCode: "USD",
			},
			options,
		);
		if (!from.ok || !to.ok) return;
		const transfer = await createAndPostPaymentTransfer(
			{
				organizationId,
				actorUserId,
				correlationId: "xfer",
				idempotencyKey: "xfer",
				code: "XFER",
				fromPaymentAccountId: from.data.id,
				toPaymentAccountId: to.data.id,
				amount: "12",
				currencyCode: "USD",
			},
			options,
		);
		expect(transfer.ok).toBe(true);
		if (!transfer.ok) return;
		const reconciled = reconcilePayments({
			payments: [transfer.data.outgoing, transfer.data.incoming],
		});
		expect(reconciled).toEqual({ ok: true });
	});
});
