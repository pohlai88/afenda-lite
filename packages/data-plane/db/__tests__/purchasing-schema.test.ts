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
		expect(orderCols.createIdempotencyKey).toBeDefined();
		expect(orderCols.createIdempotencyKey.notNull).toBe(true);
		expect(orderCols.postIdempotencyKey).toBeDefined();
		expect(orderCols.cancelIdempotencyKey).toBeDefined();
		expect(orderCols.closeIdempotencyKey).toBeDefined();
		expect(orderCols.currencyCode).toBeDefined();
		expect(orderCols.currencyCode.notNull).toBe(true);
		expect(orderCols.closedAt).toBeDefined();
		expect(orderCols.closedBy).toBeDefined();
		expect(lineCols.itemId).toBeDefined();
		expect(lineCols.itemCode).toBeDefined();
		expect(lineCols.baseUomCode).toBeDefined();
		expect(lineCols.unitPrice).toBeDefined();
		expect(lineCols.unitPrice.notNull).toBe(true);
		expect(lineCols.lineAmount).toBeDefined();
		expect(lineCols.lineAmount.notNull).toBe(true);
		expect(lineCols.overReceiptPercent).toBeDefined();
		expect(lineCols.lineIdempotencyKey).toBeDefined();
		expect(lineCols.lineIdempotencyKey.notNull).toBe(true);
	});

	it("does not define shadow supplier tables", async () => {
		const schema = await import("../src/schema/purchasing");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("purchaseSupplier");
		expect(keys.some((key) => /purchase_supplier/i.test(key))).toBe(false);
	});
});
