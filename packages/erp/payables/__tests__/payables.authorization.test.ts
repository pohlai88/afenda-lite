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
			store: createMemoryPayablesStore(),
			authorization: {
				async can(input: { permission: string }) {
					seen.push(input.permission);
					return false;
				},
			},
		};
		await createDraftSupplierInvoice(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				code: "SI-1",
				supplierId: "00000000-0000-4000-8000-000000000001",
				supplierCode: "S-1",
				supplierName: "Supplier",
				currencyCode: "USD",
			},
			options,
		);
		await getSupplierBalance(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				supplierId: "00000000-0000-4000-8000-000000000001",
			},
			options,
		);
		expect(seen).toEqual(["payables.manage", "payables.read"]);
	});
});
