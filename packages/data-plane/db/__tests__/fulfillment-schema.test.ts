import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	delivery,
	deliveryLine,
	deliveryPack,
	deliveryPick,
	proofOfDelivery,
} from "../src/schema/fulfillment";

describe("@afenda/db fulfillment schema", () => {
	it("defines delivery execution tables with hard organization_id", () => {
		const deliveryCols = getTableColumns(delivery);
		const lineCols = getTableColumns(deliveryLine);
		const pickCols = getTableColumns(deliveryPick);
		const packCols = getTableColumns(deliveryPack);
		const proofCols = getTableColumns(proofOfDelivery);

		for (const columns of [
			deliveryCols,
			lineCols,
			pickCols,
			packCols,
			proofCols,
		]) {
			expect(columns.organizationId.notNull).toBe(true);
		}

		expect(deliveryCols.salesOrderId.notNull).toBe(false);
		expect(deliveryCols.warehouseId.notNull).toBe(true);
		expect(deliveryCols.shipToPartyId.notNull).toBe(false);
		expect(lineCols.deliveryId.notNull).toBe(true);
		expect(lineCols.itemId.notNull).toBe(true);
		expect(lineCols.quantityOrdered.notNull).toBe(false);
		expect(lineCols.quantityToDeliver.notNull).toBe(true);
		expect(lineCols.salesOrderLineId.notNull).toBe(false);
		expect(pickCols.deliveryLineId.notNull).toBe(false);
		expect(pickCols.quantityPicked.notNull).toBe(true);
		expect(packCols.deliveryId.notNull).toBe(true);
		expect(proofCols.receivedByName.notNull).toBe(true);
		expect(proofCols.recordedAt.notNull).toBe(true);
		expect(proofCols.recordedBy.notNull).toBe(true);
	});
});
