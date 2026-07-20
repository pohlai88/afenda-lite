import { describe, expect, it } from "vitest";

import {
	createDraftPayment,
	createPaymentAccount,
	listPayments,
} from "../src/index";
import { createMemoryPaymentsStore } from "../src/testing";

describe("payments authorization", () => {
	it("requires fine-grained permissions for commands and queries", async () => {
		const seen: string[] = [];
		const options = {
			store: createMemoryPaymentsStore(),
			authorization: {
				async can(input: { permission: string }) {
					seen.push(input.permission);
					return false;
				},
			},
		};
		const command = await createDraftPayment(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "create",
				idempotencyKey: "pay-1",
				code: "PAY-1",
				paymentAccountId: "00000000-0000-4000-8000-000000000099",
				direction: "receipt",
				purpose: "customer_receipt",
				counterpartyId: "00000000-0000-4000-8000-000000000001",
				currencyCode: "USD",
				amount: "10",
			},
			options,
		);
		const query = await listPayments(
			{ organizationId: "org-1", actorUserId: "user-1" },
			options,
		);
		expect(command.ok).toBe(false);
		expect(query.ok).toBe(false);
		expect(seen).toEqual(["payments.payment.create", "payments.payment.read"]);
	});

	it("fails closed without an authorization port", async () => {
		const result = await listPayments(
			{ organizationId: "org-1", actorUserId: "user-1" },
			{ store: createMemoryPaymentsStore() },
		);
		expect(result).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
	});

	it("gates payment account create on account.manage", async () => {
		const seen: string[] = [];
		const result = await createPaymentAccount(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "account",
				idempotencyKey: "account-1",
				code: "CASH",
				name: "Cash",
				currencyCode: "USD",
			},
			{
				store: createMemoryPaymentsStore(),
				authorization: {
					async can(input: { permission: string }) {
						seen.push(input.permission);
						return false;
					},
				},
			},
		);
		expect(result.ok).toBe(false);
		expect(seen).toEqual(["payments.account.manage"]);
	});
});
