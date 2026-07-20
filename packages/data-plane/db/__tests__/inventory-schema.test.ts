import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	stockBalance,
	stockLedgerEntry,
	stockMovement,
	stockMovementLine,
	stockReservation,
} from "../src/schema/inventory";

describe("@afenda/db inventory schema", () => {
	it("defines stock tables with hard organization_id", () => {
		const movementCols = getTableColumns(stockMovement);
		const lineCols = getTableColumns(stockMovementLine);
		const balanceCols = getTableColumns(stockBalance);
		const ledgerCols = getTableColumns(stockLedgerEntry);
		const reservationCols = getTableColumns(stockReservation);

		expect(movementCols.organizationId.notNull).toBe(true);
		expect(lineCols.organizationId.notNull).toBe(true);
		expect(balanceCols.organizationId.notNull).toBe(true);
		expect(ledgerCols.organizationId.notNull).toBe(true);
		expect(reservationCols.organizationId.notNull).toBe(true);

		expect(movementCols.movementType).toBeDefined();
		expect(balanceCols.onHand).toBeDefined();
		expect(balanceCols.reserved).toBeDefined();
		expect(balanceCols.available).toBeDefined();
		expect(ledgerCols.quantityDelta).toBeDefined();
		expect(reservationCols.status).toBeDefined();
		expect(lineCols.itemId).toBeDefined();
	});

	it("does not define shadow inventory product tables", async () => {
		const schema = await import("../src/schema/inventory");
		const keys = Object.keys(schema);
		expect(keys).not.toContain("inventoryProduct");
		expect(keys.some((key) => /inventory_product/i.test(key))).toBe(false);
	});
});
