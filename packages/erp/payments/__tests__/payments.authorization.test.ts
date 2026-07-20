import { describe, expect, it } from "vitest";

import {
	createDraftPayment,
	createMemoryPaymentsStore,
	listPayments,
} from "../src/index";

describe("payments authorization", () => {
	it("requires manage for commands and read for queries", async () => {
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
				code: "PAY-1",
				direction: "receipt",
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
		expect(seen).toEqual(["payments.manage", "payments.read"]);
	});

	it("fails closed without an authorization port", async () => {
		const result = await listPayments(
			{ organizationId: "org-1", actorUserId: "user-1" },
			{ store: createMemoryPaymentsStore() },
		);
		expect(result).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
	});
});
