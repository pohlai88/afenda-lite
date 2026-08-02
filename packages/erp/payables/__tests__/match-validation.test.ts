import { describe, expect, it } from "vitest";

import { evaluateThreeWayMatch } from "../src/features/invoice-lifecycle/three-way-match";
import type {
	SupplierInvoice,
	SupplierInvoiceLine,
} from "../src/kernel/contracts/domain";
import type {
	GoodsReceiptMatchBasis,
	PurchaseOrderMatchBasis,
} from "../src/kernel/contracts/ports";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

function invoiceLine(input?: {
	itemId?: string;
	quantity?: string;
	unitPrice?: string;
}): SupplierInvoiceLine {
	return {
		createdAt: FIXED_DATE,
		createdBy: "user-1",
		description: "Characterization line",
		id: `line-${input?.itemId ?? "item-1"}`,
		invoiceId: "invoice-1",
		itemId: input?.itemId ?? "item-1",
		lineAmount: "100",
		lineNo: 1,
		organizationId: "org-1",
		quantity: input?.quantity ?? "10",
		unitPrice: input?.unitPrice ?? "10",
	};
}

function invoice(overrides?: Partial<SupplierInvoice>): SupplierInvoice {
	return {
		cancelledAt: null,
		cancelledBy: null,
		code: "INV-1",
		createdAt: FIXED_DATE,
		createdBy: "user-1",
		currencyCode: "USD",
		documentType: "invoice",
		id: "invoice-1",
		lines: [invoiceLine()],
		matchedAt: null,
		matchedBy: null,
		matchResult: null,
		normalizedCode: "INV-1",
		openAmount: "0",
		organizationId: "org-1",
		postedAt: null,
		postedBy: null,
		status: "draft",
		supplierCode: "SUP-1",
		supplierId: "supplier-1",
		supplierName: "Supplier One",
		totalAmount: "100",
		updatedAt: FIXED_DATE,
		updatedBy: "user-1",
		version: 1,
		...overrides,
	};
}

function purchaseOrder(
	overrides?: Partial<PurchaseOrderMatchBasis>,
): PurchaseOrderMatchBasis {
	return {
		currencyCode: "USD",
		lines: [{ itemId: "item-1", quantity: "10", unitPrice: "10" }],
		priceTolerancePct: "0",
		purchaseOrderId: "po-1",
		quantityTolerancePct: "0",
		status: "posted",
		supplierPartyId: "supplier-1",
		version: 1,
		...overrides,
	};
}

function goodsReceipt(
	overrides?: Partial<GoodsReceiptMatchBasis>,
): GoodsReceiptMatchBasis {
	return {
		goodsReceiptId: "gr-1",
		lines: [{ itemId: "item-1", quantityReceived: "10" }],
		purchaseOrderId: "po-1",
		sourceId: "po-1",
		sourceType: "purchase_order",
		status: "posted",
		version: 1,
		...overrides,
	};
}

function evaluate(input?: {
	goodsReceipt?: GoodsReceiptMatchBasis;
	invoice?: SupplierInvoice;
	purchaseOrder?: PurchaseOrderMatchBasis;
}) {
	return evaluateThreeWayMatch({
		goodsReceipt: input?.goodsReceipt ?? goodsReceipt(),
		invoice: input?.invoice ?? invoice(),
		purchaseOrder: input?.purchaseOrder ?? purchaseOrder(),
	});
}

function successfulMatch(result: ReturnType<typeof evaluate>) {
	if (!result.ok) {
		throw new Error(result.message);
	}
	return result.data;
}

describe("three-way match characterization", () => {
	it("preserves exact match evidence", () => {
		const matched = successfulMatch(evaluate());
		expect(matched.status).toBe("matched");
		expect(matched.evidence.lineResults[0]).toMatchObject({
			orderedQuantity: "10",
			outcome: "matched",
			priceVariancePct: "0",
			quantityVariancePct: "0",
			receivedQuantity: "10",
		});
	});

	it("classifies an invoice above a partial receipt as an exception", () => {
		const matched = successfulMatch(
			evaluate({
				goodsReceipt: goodsReceipt({
					lines: [{ itemId: "item-1", quantityReceived: "5" }],
				}),
			}),
		);
		expect(matched.status).toBe("exception");
		expect(matched.evidence.lineResults[0]?.quantityVariancePct).toBe("100");
	});

	it("preserves over-receipt policy when invoiced quantity stays within the order", () => {
		const matched = successfulMatch(
			evaluate({
				goodsReceipt: goodsReceipt({
					lines: [{ itemId: "item-1", quantityReceived: "12" }],
				}),
			}),
		);
		expect(matched.status).toBe("matched");
		expect(matched.evidence.lineResults[0]?.quantityVariancePct).toBe("0");
	});

	it("aggregates duplicate PO and receipt item identities", () => {
		const matched = successfulMatch(
			evaluate({
				goodsReceipt: goodsReceipt({
					lines: [
						{ itemId: "item-1", quantityReceived: "4" },
						{ itemId: "item-1", quantityReceived: "6" },
					],
				}),
				purchaseOrder: purchaseOrder({
					lines: [
						{ itemId: "item-1", quantity: "4", unitPrice: "10" },
						{ itemId: "item-1", quantity: "6", unitPrice: "10" },
					],
				}),
			}),
		);
		expect(matched.evidence.lineResults[0]).toMatchObject({
			orderedQuantity: "10",
			receivedQuantity: "10",
		});
	});

	it("uses one-millionth decimal truncation consistently", () => {
		const matched = successfulMatch(
			evaluate({
				invoice: invoice({
					lines: [invoiceLine({ quantity: "1.0000009" })],
				}),
				goodsReceipt: goodsReceipt({
					lines: [{ itemId: "item-1", quantityReceived: "1.0000001" }],
				}),
				purchaseOrder: purchaseOrder({
					lines: [{ itemId: "item-1", quantity: "1.0000001", unitPrice: "10" }],
				}),
			}),
		);
		expect(matched.status).toBe("matched");
	});

	it("accepts variance exactly equal to the configured tolerance", () => {
		const matched = successfulMatch(
			evaluate({
				invoice: invoice({ lines: [invoiceLine({ unitPrice: "11" })] }),
				purchaseOrder: purchaseOrder({ priceTolerancePct: "10" }),
			}),
		);
		expect(matched.status).toBe("matched_with_tolerance");
		expect(matched.evidence.lineResults[0]?.priceVariancePct).toBe("10");
	});

	it("rejects variance above the configured tolerance", () => {
		const matched = successfulMatch(
			evaluate({
				invoice: invoice({ lines: [invoiceLine({ unitPrice: "11.000001" })] }),
				purchaseOrder: purchaseOrder({ priceTolerancePct: "10" }),
			}),
		);
		expect(matched.status).toBe("exception");
	});

	it("preserves zero ordered basis as one-hundred-percent variance", () => {
		const matched = successfulMatch(
			evaluate({ purchaseOrder: purchaseOrder({ lines: [] }) }),
		);
		expect(matched.status).toBe("exception");
		expect(matched.evidence.lineResults[0]).toMatchObject({
			priceVariancePct: "100",
			quantityVariancePct: "100",
		});
	});

	it("rejects non-posted purchase orders", () => {
		const result = evaluate({
			purchaseOrder: purchaseOrder({ status: "draft" }),
		});
		expect(result).toMatchObject({ code: "CONFLICT", ok: false });
	});

	it("rejects supplier and currency mismatches", () => {
		const supplierResult = evaluate({
			purchaseOrder: purchaseOrder({ supplierPartyId: "supplier-2" }),
		});
		const currencyResult = evaluate({
			purchaseOrder: purchaseOrder({ currencyCode: "EUR" }),
		});
		expect(supplierResult).toMatchObject({ code: "CONFLICT", ok: false });
		expect(currencyResult).toMatchObject({ code: "CONFLICT", ok: false });
	});

	it("rejects invalid receipt status and purchase-order references", () => {
		const statusResult = evaluate({
			goodsReceipt: goodsReceipt({ status: "draft" }),
		});
		const sourceResult = evaluate({
			goodsReceipt: goodsReceipt({ sourceId: "po-other" }),
		});
		expect(statusResult).toMatchObject({ code: "CONFLICT", ok: false });
		expect(sourceResult).toMatchObject({ code: "CONFLICT", ok: false });
	});
});
