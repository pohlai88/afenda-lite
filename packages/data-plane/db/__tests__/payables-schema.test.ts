import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	supplierAllocation,
	supplierBalanceProjection,
	supplierCreditNote,
	supplierCreditNoteLine,
	supplierInvoice,
	supplierInvoiceLine,
	threeWayMatchResult,
} from "../src/schema/payables";

describe("@afenda/db payables schema", () => {
	it("defines payables tables with hard organization_id", () => {
		const invoiceCols = getTableColumns(supplierInvoice);
		const lineCols = getTableColumns(supplierInvoiceLine);
		const creditNoteCols = getTableColumns(supplierCreditNote);
		const creditLineCols = getTableColumns(supplierCreditNoteLine);
		const allocationCols = getTableColumns(supplierAllocation);
		const matchCols = getTableColumns(threeWayMatchResult);
		const balanceCols = getTableColumns(supplierBalanceProjection);

		for (const columns of [
			invoiceCols,
			lineCols,
			creditNoteCols,
			creditLineCols,
			allocationCols,
			matchCols,
			balanceCols,
		]) {
			expect(columns.organizationId.notNull).toBe(true);
		}

		expect(invoiceCols.supplierPartyId.notNull).toBe(true);
		expect(invoiceCols.purchaseOrderId.notNull).toBe(false);
		expect(lineCols.invoiceId.notNull).toBe(true);
		expect(lineCols.itemId.notNull).toBe(true);
		expect(lineCols.quantity.notNull).toBe(true);
		expect(lineCols.unitPrice.notNull).toBe(true);
		expect(lineCols.lineAmount.notNull).toBe(true);
		expect(creditNoteCols.supplierPartyId.notNull).toBe(true);
		expect(creditNoteCols.supplierInvoiceId.notNull).toBe(false);
		expect(creditNoteCols.amount.notNull).toBe(true);
		expect(creditLineCols.creditNoteId.notNull).toBe(true);
		expect(allocationCols.supplierInvoiceId.notNull).toBe(true);
		expect(allocationCols.paymentId.notNull).toBe(false);
		expect(allocationCols.creditNoteId.notNull).toBe(false);
		expect(allocationCols.status.notNull).toBe(true);
		expect(allocationCols.paymentApplicationInstructionId.notNull).toBe(false);
		expect(allocationCols.applyIdempotencyKey.notNull).toBe(false);
		expect(matchCols.supplierInvoiceId.notNull).toBe(true);
		expect(matchCols.purchaseOrderId.notNull).toBe(false);
		expect(matchCols.goodsReceiptId.notNull).toBe(false);
		expect(matchCols.matchStatus.notNull).toBe(true);
		expect(matchCols.notes.notNull).toBe(false);
		expect(matchCols.evidenceJson.notNull).toBe(false);
		expect(balanceCols.openBalance.notNull).toBe(true);
		expect(balanceCols.openBalance.default).toBe("0");
	});
});
