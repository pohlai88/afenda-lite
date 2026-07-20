import { describe, expect, it } from "vitest";

import {
	addPaymentApplicationInstruction,
	createAndPostPaymentTransfer,
	createDraftPayment,
	createPaymentAccount,
	getPaymentApplicationAvailability,
	getPaymentById,
	listPayments,
	postPayment,
	postRefund,
	reversePayment,
} from "../src/index";
import { createMemoryPaymentsStore } from "../src/testing";

const organizationId = "org-1";
const actorUserId = "user-1";
const counterpartyId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const authorization = {
	async can() {
		return true;
	},
};

async function seedAccount(
	store: ReturnType<typeof createMemoryPaymentsStore>,
) {
	const account = await createPaymentAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "account",
			idempotencyKey: "account-1",
			code: "CASH-1",
			name: "Cash",
			kind: "cash",
			currencyCode: "USD",
		},
		{ store, authorization },
	);
	expect(account.ok).toBe(true);
	if (!account.ok) throw new Error("account seed failed");
	return account.data;
}

describe("payments lifecycle", () => {
	it("posts, refunds, and reverses with application instructions and availability", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);

		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-1",
				code: "PAY-1",
				paymentAccountId: account.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId,
				currencyCode: "usd",
				amount: "100",
			},
			options,
		);
		expect(created.ok && created.data.status).toBe("draft");
		if (!created.ok) return;

		const instruction = await addPaymentApplicationInstruction(
			{
				organizationId,
				actorUserId,
				correlationId: "instruction",
				idempotencyKey: "instr-1",
				paymentId: created.data.id,
				targetModule: "receivables",
				targetDocumentType: "customer_invoice",
				targetDocumentId: targetId,
				intendedAmount: "60",
				currencyCode: "USD",
			},
			options,
		);
		expect(instruction.ok).toBe(true);

		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-1",
				paymentId: created.data.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(posted.ok && posted.data.status).toBe("posted");

		const availability = await getPaymentApplicationAvailability(
			{
				organizationId,
				actorUserId,
				paymentId: created.data.id,
			},
			options,
		);
		expect(availability.ok && availability.data.availableToApply).toBe("40");

		const refund = await postRefund(
			{
				organizationId,
				actorUserId,
				correlationId: "refund",
				idempotencyKey: "refund-1",
				code: "REF-1",
				originalPaymentId: created.data.id,
				paymentAccountId: account.id,
				refundSource: "customer_payment",
				amount: "25",
			},
			options,
		);
		expect(refund.ok && refund.data.direction).toBe("refund");
		expect(refund.ok && refund.data.status).toBe("posted");

		const afterRefund = await getPaymentApplicationAvailability(
			{
				organizationId,
				actorUserId,
				paymentId: created.data.id,
			},
			options,
		);
		expect(afterRefund.ok && afterRefund.data.availableToApply).toBe("15");

		const reversed = await reversePayment(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				idempotencyKey: "reverse-1",
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
		expect(loaded.ok && loaded.data?.applicationInstructions).toHaveLength(1);
		const listed = await listPayments(
			{ organizationId, actorUserId, direction: "refund" },
			options,
		);
		expect(listed.ok && listed.data).toHaveLength(1);
	});

	it("creates paired transfer payments atomically", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const from = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "from",
				idempotencyKey: "from-1",
				code: "BANK-OUT",
				name: "Bank out",
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
				idempotencyKey: "to-1",
				code: "BANK-IN",
				name: "Bank in",
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
				correlationId: "transfer",
				idempotencyKey: "xfer-1",
				code: "XFER-1",
				fromPaymentAccountId: from.data.id,
				toPaymentAccountId: to.data.id,
				amount: "50",
				currencyCode: "USD",
			},
			options,
		);
		expect(transfer.ok).toBe(true);
		if (!transfer.ok) return;
		expect(transfer.data.outgoing.status).toBe("posted");
		expect(transfer.data.incoming.status).toBe("posted");
		expect(transfer.data.outgoing.transferGroupId).toBe(
			transfer.data.incoming.transferGroupId,
		);
		expect(transfer.data.outgoing.direction).toBe("disbursement");
		expect(transfer.data.incoming.direction).toBe("receipt");
		expect(transfer.data.outgoing.purpose).toBe("internal_transfer");
	});

	it("rejects incompatible and over-value application instructions", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-2",
				code: "PAY-2",
				paymentAccountId: account.id,
				direction: "disbursement",
				purpose: "supplier_disbursement",
				counterpartyId,
				currencyCode: "USD",
				amount: "50",
			},
			options,
		);
		if (!created.ok) return;
		const incompatible = await addPaymentApplicationInstruction(
			{
				organizationId,
				actorUserId,
				correlationId: "bad",
				idempotencyKey: "bad-1",
				paymentId: created.data.id,
				targetModule: "receivables",
				targetDocumentType: "customer_invoice",
				targetDocumentId: targetId,
				intendedAmount: "10",
				currencyCode: "USD",
			},
			options,
		);
		expect(incompatible.ok).toBe(false);
		const excessive = await addPaymentApplicationInstruction(
			{
				organizationId,
				actorUserId,
				correlationId: "over",
				idempotencyKey: "over-1",
				paymentId: created.data.id,
				targetModule: "payables",
				targetDocumentType: "supplier_invoice",
				targetDocumentId: targetId,
				intendedAmount: "51",
				currencyCode: "USD",
			},
			options,
		);
		expect(excessive.ok).toBe(false);
	});

	it("rejects concurrent application instructions that exceed available amount", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "race-create",
				idempotencyKey: "race-pay",
				code: "PAY-RACE",
				paymentAccountId: account.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId,
				currencyCode: "USD",
				amount: "100",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		const [first, second] = await Promise.all([
			addPaymentApplicationInstruction(
				{
					organizationId,
					actorUserId,
					correlationId: "race-a",
					idempotencyKey: "race-a",
					paymentId: created.data.id,
					targetModule: "receivables",
					targetDocumentType: "customer_invoice",
					targetDocumentId: targetId,
					intendedAmount: "70",
					currencyCode: "USD",
				},
				options,
			),
			addPaymentApplicationInstruction(
				{
					organizationId,
					actorUserId,
					correlationId: "race-b",
					idempotencyKey: "race-b",
					paymentId: created.data.id,
					targetModule: "receivables",
					targetDocumentType: "customer_invoice",
					targetDocumentId: "00000000-0000-4000-8000-000000000099",
					intendedAmount: "50",
					currencyCode: "USD",
				},
				options,
			),
		]);
		const successes = [first, second].filter((result) => result.ok);
		const failures = [first, second].filter((result) => !result.ok);
		expect(successes).toHaveLength(1);
		expect(failures).toHaveLength(1);
	});

	it("returns original payment for identical create idempotency key", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);
		const input = {
			organizationId,
			actorUserId,
			correlationId: "idem-create",
			idempotencyKey: "same-create-key",
			code: "PAY-IDEM",
			paymentAccountId: account.id,
			direction: "receipt" as const,
			purpose: "customer_receipt" as const,
			counterpartyId,
			currencyCode: "USD",
			amount: "25",
		};
		const first = await createDraftPayment(input, options);
		const second = await createDraftPayment(input, options);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;
		expect(second.data.id).toBe(first.data.id);
	});
});
