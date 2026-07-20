import { describe, expect, it } from "vitest";

import {
	INVENTORY_MOVEMENT_SOURCES,
	STOCK_MOVEMENT_TYPES,
	type StockAvailability,
} from "../src/types";

/**
 * V1 scope lock — absent-by-design surfaces must stay out of the type contract.
 */
describe("inventory v1 scope contract", () => {
	it("allows only physical movement types (no in-transit)", () => {
		expect([...STOCK_MOVEMENT_TYPES]).toEqual([
			"receipt",
			"issue",
			"transfer",
			"adjustment",
		]);
		expect(STOCK_MOVEMENT_TYPES.includes("in_transit" as never)).toBe(false);
	});

	it("keeps movement sources without reservation-as-movement", () => {
		expect([...INVENTORY_MOVEMENT_SOURCES]).toEqual([
			"receiving",
			"fulfillment",
			"manual_adjustment",
			"opening_balance",
			"transfer",
		]);
		expect(INVENTORY_MOVEMENT_SOURCES.includes("reservation" as never)).toBe(
			false,
		);
	});

	it("exposes quantity-only availability without ATP / bin / lot / serial keys", () => {
		const sample = {
			organizationId: "org",
			warehouseId: "wh",
			warehouseCode: "WH1",
			itemId: "item",
			itemCode: "SKU",
			baseUomId: null,
			baseUomCode: null,
			onHandQuantity: "1",
			reservedQuantity: "0",
			availableQuantity: "1",
			asOfLedgerSequence: 1,
			balanceVersion: 1,
		} satisfies StockAvailability;

		const keys = Object.keys(sample).toSorted();
		expect(keys).toEqual(
			[
				"organizationId",
				"warehouseId",
				"warehouseCode",
				"itemId",
				"itemCode",
				"baseUomId",
				"baseUomCode",
				"onHandQuantity",
				"reservedQuantity",
				"availableQuantity",
				"asOfLedgerSequence",
				"balanceVersion",
			].toSorted(),
		);
		expect(keys).not.toContain("expectedReceiptQuantity");
		expect(keys).not.toContain("atpQuantity");
		expect(keys).not.toContain("binId");
		expect(keys).not.toContain("lotId");
		expect(keys).not.toContain("serialId");
	});
});
