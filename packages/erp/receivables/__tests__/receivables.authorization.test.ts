import { describe, expect, it } from "vitest";

import {
	createDraftSalesInvoice,
	createMemoryReceivablesStore,
	getCustomerBalance,
} from "../src/index";

const base = {
	organizationId: "org-1",
	actorUserId: "user-1",
	correlationId: "corr-1",
};

describe("receivables authorization", () => {
	it("requires fine-grained permissions for commands and queries", async () => {
		const store = createMemoryReceivablesStore();
		const seen: string[] = [];
		const authorization = {
			async can(input: { permission: string }) {
				seen.push(input.permission);
				return false;
			},
		};
		const command = await createDraftSalesInvoice(
			{
				...base,
				idempotencyKey: "idem-auth-create",
				code: "INV-1",
				customerId: "00000000-0000-4000-8000-000000000001",
				customerCode: "C-1",
				customerName: "Customer",
				currencyCode: "USD",
				invoiceSource: "manual",
				manualReason: "Auth test",
			},
			{ store, authorization },
		);
		expect(command.ok).toBe(false);
		const query = await getCustomerBalance(
			{
				organizationId: base.organizationId,
				actorUserId: base.actorUserId,
				customerId: "00000000-0000-4000-8000-000000000001",
			},
			{ store, authorization },
		);
		expect(query.ok).toBe(false);
		expect(seen).toEqual([
			"receivables.invoice.create",
			"receivables.balance.read",
		]);
	});
});
