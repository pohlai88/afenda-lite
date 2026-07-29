import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	salesOrder,
	salesOrderHold,
	salesOrderLine,
	salesOrderSchedule,
	salesPriceBook,
	salesPriceBookEntry,
	salesQuotation,
	salesQuotationLine,
	salesReturnAuthorization,
	salesReturnAuthorizationLine,
} from "../src/schema/sales";

describe("@afenda/db sales schema", () => {
	it("defines every Sales table as a hard tenant root", () => {
		for (const table of [
			salesPriceBook,
			salesPriceBookEntry,
			salesQuotation,
			salesQuotationLine,
			salesOrder,
			salesOrderLine,
			salesOrderSchedule,
			salesOrderHold,
			salesReturnAuthorization,
			salesReturnAuthorizationLine,
		]) {
			expect(getTableColumns(table).organizationId.notNull).toBe(true);
		}
		expect(getTableColumns(salesOrder).customerSnapshot).toBeDefined();
		expect(getTableColumns(salesOrderLine).itemSnapshot).toBeDefined();
	});

	it("does not define shadow customer tables", async () => {
		const schema = await import("../src/schema/sales");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("salesCustomer");
		expect(keys.some((key) => /sales_customer/i.test(key))).toBe(false);
	});
});
