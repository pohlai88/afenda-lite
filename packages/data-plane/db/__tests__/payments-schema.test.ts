import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	payment,
	paymentAccount,
	paymentAllocation,
	paymentReversal,
} from "../src/schema/payments";

describe("@afenda/db payments schema", () => {
	it("defines payment tables with hard organization_id", () => {
		const paymentAccountCols = getTableColumns(paymentAccount);
		const paymentCols = getTableColumns(payment);
		const allocationCols = getTableColumns(paymentAllocation);
		const reversalCols = getTableColumns(paymentReversal);

		for (const columns of [
			paymentAccountCols,
			paymentCols,
			allocationCols,
			reversalCols,
		]) {
			expect(columns.organizationId.notNull).toBe(true);
		}

		expect(paymentAccountCols.kind.default).toBe("cash");
		expect(paymentAccountCols.currencyCode.notNull).toBe(true);
		expect(paymentAccountCols.active.notNull).toBe(true);

		expect(paymentCols.status.default).toBe("draft");
		expect(paymentCols.direction.notNull).toBe(true);
		expect(paymentCols.paymentAccountId.notNull).toBe(true);
		expect(paymentCols.purpose.notNull).toBe(true);
		expect(paymentCols.createIdempotencyKey.notNull).toBe(true);
		expect(paymentCols.counterpartyId.notNull).toBe(false);
		expect(paymentCols.amount.notNull).toBe(true);
		expect(paymentCols.postedAt.notNull).toBe(false);
		expect(paymentCols.reversedAt.notNull).toBe(false);

		expect(allocationCols.paymentId.notNull).toBe(true);
		expect(allocationCols.targetModule.notNull).toBe(true);
		expect(allocationCols.targetDocumentType.notNull).toBe(true);
		expect(allocationCols.targetDocumentId.notNull).toBe(true);
		expect(allocationCols.intendedAmount.notNull).toBe(true);
		expect(allocationCols.appliedAmount.notNull).toBe(true);
		expect(allocationCols.currencyCode.notNull).toBe(true);
		expect(allocationCols.status.default).toBe("pending");

		expect(reversalCols.paymentId.notNull).toBe(true);
		expect(reversalCols.reason.notNull).toBe(true);
		expect(reversalCols.reversedAt.notNull).toBe(true);
		expect(reversalCols.reversedBy.notNull).toBe(true);
	});
});
