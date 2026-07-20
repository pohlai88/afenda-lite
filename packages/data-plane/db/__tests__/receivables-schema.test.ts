import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	customerAllocation,
	customerBalanceProjection,
	salesCreditNote,
	salesInvoice,
	salesInvoiceLine,
} from "../src/schema/receivables";

describe("@afenda/db receivables schema", () => {
	it("defines receivables tables with hard organization_id", () => {
		const invoiceCols = getTableColumns(salesInvoice);
		const lineCols = getTableColumns(salesInvoiceLine);
		const creditNoteCols = getTableColumns(salesCreditNote);
		const allocationCols = getTableColumns(customerAllocation);
		const balanceCols = getTableColumns(customerBalanceProjection);

		for (const columns of [
			invoiceCols,
			lineCols,
			creditNoteCols,
			allocationCols,
			balanceCols,
		]) {
			expect(columns.organizationId.notNull).toBe(true);
		}

		expect(invoiceCols.customerPartyId.notNull).toBe(true);
		expect(invoiceCols.salesOrderId.notNull).toBe(false);
		expect(lineCols.invoiceId.notNull).toBe(true);
		expect(lineCols.itemId.notNull).toBe(true);
		expect(lineCols.quantity.notNull).toBe(true);
		expect(lineCols.unitPrice.notNull).toBe(true);
		expect(lineCols.lineAmount.notNull).toBe(true);
		expect(creditNoteCols.customerPartyId.notNull).toBe(true);
		expect(creditNoteCols.salesInvoiceId.notNull).toBe(false);
		expect(allocationCols.salesInvoiceId.notNull).toBe(true);
		expect(allocationCols.paymentId.notNull).toBe(false);
		expect(allocationCols.creditNoteId.notNull).toBe(false);
		expect(allocationCols.allocatedAt.notNull).toBe(true);
		expect(allocationCols.allocatedBy.notNull).toBe(true);
		expect(balanceCols.openBalance.notNull).toBe(true);
		expect(balanceCols.openBalance.default).toBe("0");
	});
});
