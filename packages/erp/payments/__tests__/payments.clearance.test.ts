import { describe, expect, it } from "vitest";

import {
	createDraftPayment,
	createPaymentAccount,
	postPayment,
	seedDefaultPaymentMethods,
	updateInstrumentClearance,
} from "../src/index";
import { createMemoryPaymentsStore } from "../src/testing";

const organizationId = "org-1";
const actorUserId = "user-1";
const authorization = {
	can() {
		return Promise.resolve(true);
	},
};

async function seedPostedCheckPayment() {
	const store = createMemoryPaymentsStore();
	const options = { store, authorization };
	const seeded = await seedDefaultPaymentMethods(
		{
			organizationId,
			actorUserId,
			correlationId: "method",
			idempotencyKey: "methods-1",
		},
		options,
	);
	if (!seeded.ok) {
		throw new Error("method seed failed");
	}
	const method = seeded.data.find((entry) => entry.code === "check");
	if (!method) {
		throw new Error("check method missing");
	}
	const account = await createPaymentAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "account",
			idempotencyKey: "account-1",
			code: "BANK-1",
			name: "Bank",
			kind: "bank",
			currencyCode: "USD",
		},
		options,
	);
	if (!account.ok) {
		throw new Error("account seed failed");
	}
	const draft = await createDraftPayment(
		{
			organizationId,
			actorUserId,
			correlationId: "create",
			idempotencyKey: "check-pay-1",
			code: "PAY-CHECK-1",
			paymentAccountId: account.data.id,
			paymentMethodId: method.id,
			direction: "receipt",
			purpose: "customer_receipt",
			currencyCode: "USD",
			amount: "100",
			instrument: {
				kind: "check",
				number: "000123",
				issuedOn: "2026-08-01",
			},
		},
		options,
	);
	if (!draft.ok) {
		throw new Error("draft failed");
	}
	return { options, draft: draft.data };
}

describe("instrument clearance", () => {
	it("clears a posted check through the dedicated operation", async () => {
		const { options, draft } = await seedPostedCheckPayment();
		const posted = await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-1",
				paymentId: draft.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(posted.ok && posted.data.clearanceStatus).toBe("pending");
		if (!posted.ok) {
			return;
		}

		const draftAttempt = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "clear-draft",
				idempotencyKey: "clear-draft",
				paymentId: draft.id,
				expectedVersion: 1,
				status: "cleared",
				clearanceDate: "2026-08-02",
			},
			options,
		);
		expect(draftAttempt.ok).toBe(false); // stale version

		const cleared = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "clear",
				idempotencyKey: "clear-1",
				paymentId: draft.id,
				expectedVersion: posted.data.version,
				status: "cleared",
				clearanceDate: "2026-08-02",
				settlementReference: "STMT-9",
			},
			options,
		);
		expect(cleared.ok).toBe(true);
		if (!cleared.ok) {
			return;
		}
		expect(cleared.data.clearanceStatus).toBe("cleared");
		expect(
			cleared.data.instrument?.kind === "check" &&
				cleared.data.instrument.clearanceDate,
		).toBe("2026-08-02");

		const replay = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "clear-replay",
				idempotencyKey: "clear-1",
				paymentId: draft.id,
				expectedVersion: posted.data.version,
				status: "cleared",
				clearanceDate: "2026-08-02",
			},
			options,
		);
		expect(replay.ok).toBe(true);
		if (replay.ok) {
			expect(replay.data.version).toBe(cleared.data.version);
		}
	});

	it("rejects cleared without a clearanceDate and pending with one", async () => {
		const { options, draft } = await seedPostedCheckPayment();
		await postPayment(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				idempotencyKey: "post-1",
				paymentId: draft.id,
				expectedVersion: 1,
			},
			options,
		);
		const missingDate = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "bad-1",
				idempotencyKey: "bad-1",
				paymentId: draft.id,
				expectedVersion: 2,
				status: "cleared",
			},
			options,
		);
		expect(missingDate.ok).toBe(false);

		const pendingWithDate = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "bad-2",
				idempotencyKey: "bad-2",
				paymentId: draft.id,
				expectedVersion: 2,
				status: "pending",
				clearanceDate: "2026-08-02",
			},
			options,
		);
		expect(pendingWithDate.ok).toBe(false);
	});

	it("rejects clearance changes on a draft payment", async () => {
		const { options, draft } = await seedPostedCheckPayment();
		const result = await updateInstrumentClearance(
			{
				organizationId,
				actorUserId,
				correlationId: "draft-clear",
				idempotencyKey: "draft-clear",
				paymentId: draft.id,
				expectedVersion: 1,
				status: "cleared",
				clearanceDate: "2026-08-02",
			},
			options,
		);
		expect(result.ok).toBe(false);
	});
});
