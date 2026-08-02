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
	seedDefaultPaymentMethods,
} from "../src/index";
import { createMemoryPaymentsStore } from "../src/testing";

const organizationId = "org-1";
const actorUserId = "user-1";
const counterpartyId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const authorization = {
	can() {
		return Promise.resolve(true);
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
	if (!account.ok) {
		throw new Error("account seed failed");
	}
	return account.data;
}

async function seedMethod(
	store: ReturnType<typeof createMemoryPaymentsStore>,
	code = "other",
) {
	const seeded = await seedDefaultPaymentMethods(
		{
			organizationId,
			actorUserId,
			correlationId: "method",
			idempotencyKey: "methods-1",
		},
		{ store, authorization },
	);
	if (!seeded.ok) {
		throw new Error("method seed failed");
	}
	const method = seeded.data.find((entry) => entry.code === code);
	if (!method) {
		throw new Error("default method missing");
	}
	return method;
}

describe("payments lifecycle", () => {
	it("posts, refunds, and reverses with application instructions and availability", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);
		const method = await seedMethod(store);

		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-1",
				code: "PAY-1",
				paymentAccountId: account.id,
				paymentMethodId: method.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId,
				currencyCode: "usd",
				amount: "100",
			},
			options,
		);
		expect(created.ok && created.data.status).toBe("draft");
		if (!created.ok) {
			return;
		}

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
				paymentMethodId: method.id,
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
		const method = await seedMethod(store);
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
		if (!(from.ok && to.ok)) {
			return;
		}

		const transfer = await createAndPostPaymentTransfer(
			{
				organizationId,
				actorUserId,
				correlationId: "transfer",
				idempotencyKey: "xfer-1",
				code: "XFER-1",
				fromPaymentAccountId: from.data.id,
				toPaymentAccountId: to.data.id,
				paymentMethodId: method.id,
				amount: "50",
				currencyCode: "USD",
			},
			options,
		);
		expect(transfer.ok).toBe(true);
		if (!transfer.ok) {
			return;
		}
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
		const method = await seedMethod(store);
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "create",
				idempotencyKey: "pay-2",
				code: "PAY-2",
				paymentAccountId: account.id,
				paymentMethodId: method.id,
				direction: "disbursement",
				purpose: "supplier_disbursement",
				counterpartyId,
				currencyCode: "USD",
				amount: "50",
			},
			options,
		);
		if (!created.ok) {
			return;
		}
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
		const method = await seedMethod(store);
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "race-create",
				idempotencyKey: "race-pay",
				code: "PAY-RACE",
				paymentAccountId: account.id,
				paymentMethodId: method.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId,
				currencyCode: "USD",
				amount: "100",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
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

	it("freezes the method snapshot and functional amounts at post", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const method = await seedMethod(store, "bank-transfer");
		const account = await createPaymentAccount(
			{
				organizationId,
				actorUserId,
				correlationId: "eur-account",
				idempotencyKey: "eur-account-1",
				code: "BANK-EUR",
				name: "Bank EUR",
				kind: "bank",
				currencyCode: "EUR",
			},
			options,
		);
		if (!account.ok) {
			throw new Error("account seed failed");
		}
		const created = await createDraftPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "fx-create",
				idempotencyKey: "fx-pay-1",
				code: "PAY-FX-1",
				paymentAccountId: account.data.id,
				paymentMethodId: method.id,
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId,
				currencyCode: "EUR",
				amount: "100",
				fxContext: {
					transactionCurrency: "EUR",
					functionalCurrency: "USD",
					exchangeRate: "1.1",
					rateDate: "2026-08-01",
				},
				deductions: [
					{
						kind: "bank_charge",
						amount: "2",
						accountingPurposeCode: "bank-fees",
					},
				],
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.functionalAmount).toBe("110");
		expect(created.data.methodSnapshot).toBeNull();
		expect(created.data.deductions[0]?.functionalAmount).toBeNull();
		expect(created.data.deductions[0]?.effect).toBe("reduces_cash_movement");

		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "fx-post",
				idempotencyKey: "fx-post-1",
				paymentId: created.data.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) {
			return;
		}
		expect(posted.data.methodSnapshot).toEqual({
			paymentMethodId: method.id,
			code: "bank-transfer",
			kind: "wire",
		});
		expect(posted.data.functionalAmount).toBe("110");
		expect(posted.data.deductions[0]?.functionalAmount).toBe("2.2");
	});

	it("returns original payment for identical create idempotency key", async () => {
		const store = createMemoryPaymentsStore();
		const options = { store, authorization };
		const account = await seedAccount(store);
		const method = await seedMethod(store);
		const input = {
			organizationId,
			actorUserId,
			correlationId: "idem-create",
			idempotencyKey: "same-create-key",
			code: "PAY-IDEM",
			paymentAccountId: account.id,
			paymentMethodId: method.id,
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
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(second.data.id).toBe(first.data.id);
	});
});
