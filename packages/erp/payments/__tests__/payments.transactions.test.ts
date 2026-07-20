import { describe, expect, it } from "vitest";

import {
	addPaymentApplicationInstruction,
	createAndPostPaymentTransfer,
	createDraftPayment,
	createPaymentAccount,
	getPaymentApplicationAvailability,
	getPaymentById,
	PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
	PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
	PAYMENTS_ERROR_TRANSFER_INVALID,
	postPayment,
	postRefund,
	reversePayment,
} from "../src/index";
import type { PaymentsStore } from "../src/model";
import { reconcilePayments } from "../src/reconcile";
import { createMemoryPaymentsStore } from "../src/testing";

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
		if (excessive.ok) return;
		expect(
			(excessive.details as { paymentsCode?: string } | undefined)
				?.paymentsCode,
		).toBe(PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED);
	});

	it("attaches domain paymentsCode on not-found, transfer, and credit-target rejects", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const missing = await getPaymentApplicationAvailability(
			{
				organizationId,
				actorUserId,
				paymentId: "00000000-0000-4000-8000-000000000099",
			},
			options,
		);
		expect(missing.ok).toBe(false);
		if (!missing.ok) {
			expect(
				(missing.details as { paymentsCode?: string } | undefined)
					?.paymentsCode,
			).toBe(PAYMENTS_ERROR_PAYMENT_NOT_FOUND);
		}

		const account = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "account-codes",
				idempotencyKey: "account-codes",
				code: "CASH-CODES",
				name: "Cash",
				currencyCode: "USD",
			},
			options,
		);
		expect(account.ok).toBe(true);
		if (!account.ok) return;

		const sameAccount = await (store as PaymentsStore).createAndPostTransfer({
			organizationId,
			actorUserId,
			correlationId: "transfer-same",
			idempotencyKey: "transfer-same",
			code: "XFER-SAME",
			normalizedCode: "XFER-SAME",
			fromPaymentAccountId: account.data.id,
			toPaymentAccountId: account.data.id,
			amount: "5",
			currencyCode: "USD",
			reference: null,
		});
		expect(sameAccount.ok).toBe(false);
		if (!sameAccount.ok) {
			expect(
				(sameAccount.details as { paymentsCode?: string } | undefined)
					?.paymentsCode,
			).toBe(PAYMENTS_ERROR_TRANSFER_INVALID);
		}

		const draft = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "draft-credit",
				idempotencyKey: "draft-credit",
				code: "PAY-CREDIT-REJECT",
				paymentAccountId: account.data.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId: "00000000-0000-4000-8000-000000000001",
				currencyCode: "USD",
				amount: "10",
			},
			options,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const creditTarget = await addPaymentApplicationInstruction(
			{
				organizationId,
				actorUserId,
				correlationId: "credit-target",
				idempotencyKey: "credit-target",
				paymentId: draft.data.id,
				targetModule: "receivables",
				targetDocumentType: "customer_credit",
				targetDocumentId: "00000000-0000-4000-8000-000000000002",
				intendedAmount: "5",
				currencyCode: "USD",
			},
			options,
		);
		expect(creditTarget.ok).toBe(false);
		if (!creditTarget.ok) {
			expect(creditTarget.code).toBe("BAD_REQUEST");
		}
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
