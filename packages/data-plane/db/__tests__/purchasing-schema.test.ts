import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { purchaseOrder, purchaseOrderLine } from "../src/schema/purchasing";

describe("@afenda/db purchasing schema", () => {
	it("defines purchase_order / purchase_order_line with hard organization_id", () => {
		const orderCols = getTableColumns(purchaseOrder);
		const lineCols = getTableColumns(purchaseOrderLine);
		expect(orderCols.organizationId.notNull).toBe(true);
		expect(lineCols.organizationId.notNull).toBe(true);
		expect(orderCols.partyId).toBeDefined();
		expect(orderCols.partyCode).toBeDefined();
		expect(orderCols.partyName).toBeDefined();
		expect(orderCols.warehouseId).toBeDefined();
		expect(lineCols.itemId).toBeDefined();
		expect(lineCols.itemCode).toBeDefined();
		expect(lineCols.baseUomCode).toBeDefined();
	});

	it("does not define shadow supplier tables", async () => {
		const schema = await import("../src/schema/purchasing");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("purchaseSupplier");
		expect(keys.some((key) => /purchase_supplier/i.test(key))).toBe(false);
	});
});
