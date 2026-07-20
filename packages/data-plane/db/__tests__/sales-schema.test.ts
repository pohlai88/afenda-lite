import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { salesOrder, salesOrderLine } from "../src/schema/sales";

describe("@afenda/db sales schema", () => {
	it("defines sales_order / sales_order_line with hard organization_id", () => {
		const orderCols = getTableColumns(salesOrder);
		const lineCols = getTableColumns(salesOrderLine);
		expect(orderCols.organizationId.notNull).toBe(true);
		expect(lineCols.organizationId.notNull).toBe(true);
		expect(orderCols.partyId).toBeDefined();
		expect(orderCols.partyCode).toBeDefined();
		expect(orderCols.partyName).toBeDefined();
		expect(lineCols.itemId).toBeDefined();
		expect(lineCols.itemCode).toBeDefined();
		expect(lineCols.baseUomCode).toBeDefined();
	});

	it("does not define shadow customer tables", async () => {
		const schema = await import("../src/schema/sales");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("salesCustomer");
		expect(keys.some((key) => /sales_customer/i.test(key))).toBe(false);
	});
});
