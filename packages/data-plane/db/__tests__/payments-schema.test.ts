import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	payment,
	paymentAllocation,
	paymentReversal,
} from "../src/schema/payments";

describe("@afenda/db payments schema", () => {
	it("defines payment tables with hard organization_id", () => {
		const paymentCols = getTableColumns(payment);
		const allocationCols = getTableColumns(paymentAllocation);
		const reversalCols = getTableColumns(paymentReversal);

		for (const columns of [paymentCols, allocationCols, reversalCols]) {
			expect(columns.organizationId.notNull).toBe(true);
		}

		expect(paymentCols.status.default).toBe("draft");
		expect(paymentCols.direction.notNull).toBe(true);
		expect(paymentCols.counterpartyId.notNull).toBe(false);
		expect(paymentCols.amount.notNull).toBe(true);
		expect(paymentCols.postedAt.notNull).toBe(false);
		expect(paymentCols.reversedAt.notNull).toBe(false);

		expect(allocationCols.paymentId.notNull).toBe(true);
		expect(allocationCols.targetType.notNull).toBe(true);
		expect(allocationCols.targetId.notNull).toBe(true);
		expect(allocationCols.amount.notNull).toBe(true);

		expect(reversalCols.paymentId.notNull).toBe(true);
		expect(reversalCols.reason.notNull).toBe(true);
		expect(reversalCols.reversedAt.notNull).toBe(true);
		expect(reversalCols.reversedBy.notNull).toBe(true);
	});
});
