import { describe, expect, it } from "vitest";

import {
	createDraftSupplierInvoice,
	createMemoryPayablesStore,
	getSupplierBalance,
} from "../src/index";

describe("payables authorization", () => {
	it("requires manage for commands and read for queries", async () => {
		const seen: string[] = [];
		const options = {
			authorization: {
				can(input: { permission: string }) {
					seen.push(input.permission);
					return Promise.resolve(false);
				},
			},
			store: createMemoryPayablesStore(),
		};
		await createDraftSupplierInvoice(
			{
				actorUserId: "user-1",
				code: "SI-1",
				correlationId: "corr-1",
				currencyCode: "USD",
				organizationId: "org-1",
				supplierCode: "S-1",
				supplierId: "00000000-0000-4000-8000-000000000001",
				supplierName: "Supplier",
			},
			options,
		);
		await getSupplierBalance(
			{
				actorUserId: "user-1",
				organizationId: "org-1",
				supplierId: "00000000-0000-4000-8000-000000000001",
			},
			options,
		);
		expect(seen).toEqual(["payables.manage", "payables.read"]);
	});
});
