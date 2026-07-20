import { fail, ok, type Result } from "@afenda/errors/result";
import type {
	SupplierInvoice,
	ThreeWayMatchEvidence,
	ThreeWayMatchStatus,
} from "./model";
import type { GoodsReceiptMatchBasis, PurchaseOrderMatchBasis } from "./ports";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

/**
 * Validates PO + GR basis against invoice lines before store match write.
 * Produces immutable quantity and price evidence from the supplied port snapshots.
 */
export function evaluateThreeWayMatch(input: {
	invoice: SupplierInvoice;
	purchaseOrder: PurchaseOrderMatchBasis;
	goodsReceipt: GoodsReceiptMatchBasis;
}): Result<{ status: ThreeWayMatchStatus; evidence: ThreeWayMatchEvidence }> {
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
	const orderedByItem = new Map<
		string,
		{ quantity: bigint; unitPrice: string }
	>();
	for (const line of purchaseOrder.lines) {
		const prior = orderedByItem.get(line.itemId);
		orderedByItem.set(line.itemId, {
			quantity: (prior?.quantity ?? 0n) + decimal(line.quantity),
			unitPrice: line.unitPrice,
		});
	}

	const quantityTolerance = decimal(purchaseOrder.quantityTolerancePct ?? "0");
	const priceTolerance = decimal(purchaseOrder.priceTolerancePct ?? "0");
	const lineResults: ThreeWayMatchEvidence["lineResults"] = [];
	let hasTolerance = false;
	let hasException = false;
	for (const line of invoice.lines) {
		const orderedBasis = orderedByItem.get(line.itemId);
		const ordered = orderedBasis?.quantity ?? 0n;
		const received = receivedByItem.get(line.itemId) ?? 0n;
		const invoiced = decimal(line.quantity);
		const poUnitPrice = decimal(orderedBasis?.unitPrice ?? "0");
		const invoicedUnitPrice = decimal(line.unitPrice);
		const quantityBasis = ordered < received ? ordered : received;
		const quantityVariance =
			quantityBasis === 0n
				? invoiced === 0n
					? 0n
					: 100n * SCALE
				: invoiced <= quantityBasis
					? 0n
					: ((invoiced - quantityBasis) * 100n * SCALE) / quantityBasis;
		const priceVariance =
			poUnitPrice === 0n
				? invoicedUnitPrice === 0n
					? 0n
					: 100n * SCALE
				: ((invoicedUnitPrice - poUnitPrice < 0n
						? poUnitPrice - invoicedUnitPrice
						: invoicedUnitPrice - poUnitPrice) *
						100n *
						SCALE) /
					poUnitPrice;
		const exact = quantityVariance === 0n && priceVariance === 0n;
		const withinTolerance =
			quantityVariance <= quantityTolerance && priceVariance <= priceTolerance;
		const outcome = exact
			? "matched"
			: withinTolerance
				? "matched_with_tolerance"
				: "exception";
		if (outcome === "exception") hasException = true;
		if (outcome === "matched_with_tolerance") hasTolerance = true;
		lineResults.push({
			itemId: line.itemId,
			invoicedQuantity: line.quantity,
			invoicedUnitPrice: line.unitPrice,
			orderedQuantity: format(ordered),
			receivedQuantity: format(received),
			purchaseOrderUnitPrice: orderedBasis?.unitPrice ?? "0",
			quantityVariancePct: format(quantityVariance),
			priceVariancePct: format(priceVariance),
			outcome,
		});
	}

	const status = hasException
		? "exception"
		: hasTolerance
			? "matched_with_tolerance"
			: "matched";
	return ok({
		status,
		evidence: {
			quantityTolerancePct: purchaseOrder.quantityTolerancePct ?? "0",
			priceTolerancePct: purchaseOrder.priceTolerancePct ?? "0",
			lineResults,
		},
	});
}

function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}
