import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	goodsReceipt,
	goodsReceiptLine,
	receivingDiscrepancy,
} from "../src/schema/receiving";

describe("@afenda/db receiving schema", () => {
	it("defines receipt tables with hard organization_id", () => {
		const receiptCols = getTableColumns(goodsReceipt);
		const lineCols = getTableColumns(goodsReceiptLine);
		const discrepancyCols = getTableColumns(receivingDiscrepancy);

		expect(receiptCols.organizationId.notNull).toBe(true);
		expect(lineCols.organizationId.notNull).toBe(true);
		expect(discrepancyCols.organizationId.notNull).toBe(true);

		expect(receiptCols.sourceType.notNull).toBe(true);
		expect(receiptCols.warehouseId).toBeDefined();
		expect(lineCols.goodsReceiptId.notNull).toBe(true);
		expect(lineCols.itemId.notNull).toBe(true);
		expect(lineCols.quantityOrdered.notNull).toBe(false);
		expect(lineCols.quantityReceived.notNull).toBe(true);
		expect(lineCols.quantityAccepted.notNull).toBe(true);
		expect(lineCols.quantityRejected.notNull).toBe(true);
		expect(lineCols.quantityDamaged.notNull).toBe(true);
		expect(receiptCols.inventoryApplicationStatus.notNull).toBe(true);
		expect(discrepancyCols.goodsReceiptLineId.notNull).toBe(false);
		expect(discrepancyCols.discrepancyType.notNull).toBe(true);
		expect(discrepancyCols.status.notNull).toBe(true);
	});
});
