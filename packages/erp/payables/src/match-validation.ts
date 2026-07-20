import { fail, ok, type Result } from "@afenda/errors/result";
import type { SupplierInvoice, ThreeWayMatchStatus } from "./model";
import type { GoodsReceiptMatchBasis, PurchaseOrderMatchBasis } from "./ports";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

/**
 * Validates PO + GR basis against invoice lines before store match write.
 * Returns match status for v1 (always `matched` when basis covers lines).
 */
export function evaluateThreeWayMatch(input: {
	invoice: SupplierInvoice;
	purchaseOrder: PurchaseOrderMatchBasis;
	goodsReceipt: GoodsReceiptMatchBasis;
}): Result<ThreeWayMatchStatus> {
	const { invoice, purchaseOrder, goodsReceipt } = input;

	if (purchaseOrder.status !== "posted") {
		return fail("CONFLICT", "Purchase order must be posted for matching", {
			purchaseOrderId: purchaseOrder.purchaseOrderId,
			status: purchaseOrder.status,
		});
	}
	if (purchaseOrder.supplierPartyId !== invoice.supplierId) {
		return fail(
			"CONFLICT",
			"Purchase order supplier does not match invoice supplier",
			{
				purchaseOrderId: purchaseOrder.purchaseOrderId,
				invoiceSupplierId: invoice.supplierId,
			},
		);
	}
	if (purchaseOrder.currencyCode !== invoice.currencyCode) {
		return fail(
			"CONFLICT",
			"Purchase order and invoice currencies must match for matching",
			{
				purchaseOrderCurrency: purchaseOrder.currencyCode,
				invoiceCurrency: invoice.currencyCode,
			},
		);
	}
	if (goodsReceipt.status !== "posted" && goodsReceipt.status !== "closed") {
		return fail(
			"CONFLICT",
			"Goods receipt must be posted or closed for matching",
			{
				goodsReceiptId: goodsReceipt.goodsReceiptId,
				status: goodsReceipt.status,
			},
		);
	}
	if (
		goodsReceipt.sourceType !== "purchase_order" ||
		goodsReceipt.sourceId !== purchaseOrder.purchaseOrderId ||
		goodsReceipt.purchaseOrderId !== purchaseOrder.purchaseOrderId
	) {
		return fail(
			"CONFLICT",
			"Goods receipt must reference the matched purchase order",
			{
				goodsReceiptId: goodsReceipt.goodsReceiptId,
				purchaseOrderId: purchaseOrder.purchaseOrderId,
			},
		);
	}

	const receivedByItem = new Map<string, bigint>();
	for (const line of goodsReceipt.lines) {
		receivedByItem.set(
			line.itemId,
			(receivedByItem.get(line.itemId) ?? 0n) + decimal(line.quantityReceived),
		);
	}
	const orderedByItem = new Map<string, bigint>();
	for (const line of purchaseOrder.lines) {
		orderedByItem.set(
			line.itemId,
			(orderedByItem.get(line.itemId) ?? 0n) + decimal(line.quantity),
		);
	}

	for (const line of invoice.lines) {
		const ordered = orderedByItem.get(line.itemId) ?? 0n;
		const received = receivedByItem.get(line.itemId) ?? 0n;
		const invoiced = decimal(line.quantity);
		if (ordered < invoiced || received < invoiced) {
			return fail(
				"CONFLICT",
				"Invoice line exceeds ordered or received quantity",
				{
					itemId: line.itemId,
					invoiced: line.quantity,
				},
			);
		}
	}

	return ok("matched");
}
