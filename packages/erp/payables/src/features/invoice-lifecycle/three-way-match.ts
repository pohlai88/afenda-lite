import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	ThreeWayMatchEvidence,
	ThreeWayMatchStatus,
} from "../../kernel/contracts/domain";
import type {
	GoodsReceiptMatchBasis,
	PurchaseOrderMatchBasis,
} from "../../kernel/contracts/ports";

const SCALE = 1_000_000n;
const TRAILING_ZERO_PATTERN = /0+$/;

interface ThreeWayMatchInput {
	goodsReceipt: GoodsReceiptMatchBasis;
	invoice: SupplierInvoice;
	purchaseOrder: PurchaseOrderMatchBasis;
}

interface OrderedItemBasis {
	quantity: bigint;
	unitPrice: string;
}

interface ThreeWayMatchAggregates {
	input: ThreeWayMatchInput;
	orderedByItem: Map<string, OrderedItemBasis>;
	priceTolerance: bigint;
	quantityTolerance: bigint;
	receivedByItem: Map<string, bigint>;
}

interface LineVariance {
	invoicedQuantity: string;
	invoicedUnitPrice: string;
	itemId: string;
	orderedQuantity: bigint;
	priceVariance: bigint;
	purchaseOrderUnitPrice: string;
	quantityVariance: bigint;
	receivedQuantity: bigint;
}

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function validateThreeWayMatchInput(
	input: ThreeWayMatchInput,
): Result<ThreeWayMatchInput> {
	const { goodsReceipt, invoice, purchaseOrder } = input;
	if (purchaseOrder.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Purchase order must be posted for matching",
		});
	}
	if (purchaseOrder.supplierPartyId !== invoice.supplierId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Purchase order supplier does not match invoice supplier",
		});
	}
	if (purchaseOrder.currencyCode !== invoice.currencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Purchase order and invoice currencies must match for matching",
		});
	}
	if (goodsReceipt.status !== "posted" && goodsReceipt.status !== "closed") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Goods receipt must be posted or closed for matching",
		});
	}
	if (
		goodsReceipt.sourceType !== "purchase_order" ||
		goodsReceipt.sourceId !== purchaseOrder.purchaseOrderId ||
		goodsReceipt.purchaseOrderId !== purchaseOrder.purchaseOrderId
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Goods receipt must reference the matched purchase order",
		});
	}
	return errorResult.ok(input);
}

function aggregateThreeWayMatchFacts(
	input: ThreeWayMatchInput,
): ThreeWayMatchAggregates {
	const receivedByItem = new Map<string, bigint>();
	for (const line of input.goodsReceipt.lines) {
		receivedByItem.set(
			line.itemId,
			(receivedByItem.get(line.itemId) ?? 0n) + decimal(line.quantityReceived),
		);
	}

	const orderedByItem = new Map<string, OrderedItemBasis>();
	for (const line of input.purchaseOrder.lines) {
		const prior = orderedByItem.get(line.itemId);
		orderedByItem.set(line.itemId, {
			quantity: (prior?.quantity ?? 0n) + decimal(line.quantity),
			unitPrice: line.unitPrice,
		});
	}

	return {
		input,
		orderedByItem,
		priceTolerance: decimal(input.purchaseOrder.priceTolerancePct ?? "0"),
		quantityTolerance: decimal(input.purchaseOrder.quantityTolerancePct ?? "0"),
		receivedByItem,
	};
}

function percentageOverage(actual: bigint, basis: bigint): bigint {
	if (basis === 0n) {
		return actual === 0n ? 0n : 100n * SCALE;
	}
	if (actual <= basis) {
		return 0n;
	}
	return ((actual - basis) * 100n * SCALE) / basis;
}

function percentageDifference(left: bigint, right: bigint): bigint {
	if (right === 0n) {
		return left === 0n ? 0n : 100n * SCALE;
	}
	const difference = left < right ? right - left : left - right;
	return (difference * 100n * SCALE) / right;
}

function calculateThreeWayMatchVariances(
	aggregates: ThreeWayMatchAggregates,
): LineVariance[] {
	return aggregates.input.invoice.lines.map((line) => {
		const orderedBasis = aggregates.orderedByItem.get(line.itemId);
		const orderedQuantity = orderedBasis?.quantity ?? 0n;
		const receivedQuantity = aggregates.receivedByItem.get(line.itemId) ?? 0n;
		const quantityBasis =
			orderedQuantity < receivedQuantity ? orderedQuantity : receivedQuantity;
		return {
			invoicedQuantity: line.quantity,
			invoicedUnitPrice: line.unitPrice,
			itemId: line.itemId,
			orderedQuantity,
			priceVariance: percentageDifference(
				decimal(line.unitPrice),
				decimal(orderedBasis?.unitPrice ?? "0"),
			),
			purchaseOrderUnitPrice: orderedBasis?.unitPrice ?? "0",
			quantityVariance: percentageOverage(
				decimal(line.quantity),
				quantityBasis,
			),
			receivedQuantity,
		};
	});
}

function lineOutcome(
	variance: LineVariance,
	quantityTolerance: bigint,
	priceTolerance: bigint,
): ThreeWayMatchEvidence["lineResults"][number]["outcome"] {
	if (variance.quantityVariance === 0n && variance.priceVariance === 0n) {
		return "matched";
	}
	if (
		variance.quantityVariance <= quantityTolerance &&
		variance.priceVariance <= priceTolerance
	) {
		return "matched_with_tolerance";
	}
	return "exception";
}

function overallStatus(
	lineResults: ThreeWayMatchEvidence["lineResults"],
): ThreeWayMatchStatus {
	if (lineResults.some((line) => line.outcome === "exception")) {
		return "exception";
	}
	if (lineResults.some((line) => line.outcome === "matched_with_tolerance")) {
		return "matched_with_tolerance";
	}
	return "matched";
}

function classifyThreeWayMatch(input: {
	aggregates: ThreeWayMatchAggregates;
	variances: LineVariance[];
}): { evidence: ThreeWayMatchEvidence; status: ThreeWayMatchStatus } {
	const lineResults = input.variances.map((variance) => ({
		invoicedQuantity: variance.invoicedQuantity,
		invoicedUnitPrice: variance.invoicedUnitPrice,
		itemId: variance.itemId,
		orderedQuantity: format(variance.orderedQuantity),
		outcome: lineOutcome(
			variance,
			input.aggregates.quantityTolerance,
			input.aggregates.priceTolerance,
		),
		priceVariancePct: format(variance.priceVariance),
		purchaseOrderUnitPrice: variance.purchaseOrderUnitPrice,
		quantityVariancePct: format(variance.quantityVariance),
		receivedQuantity: format(variance.receivedQuantity),
	}));

	return {
		evidence: {
			lineResults,
			priceTolerancePct:
				input.aggregates.input.purchaseOrder.priceTolerancePct ?? "0",
			quantityTolerancePct:
				input.aggregates.input.purchaseOrder.quantityTolerancePct ?? "0",
		},
		status: overallStatus(lineResults),
	};
}

/**
 * Validates PO + GR basis against invoice lines before store match write.
 * Produces immutable quantity and price evidence from the supplied port snapshots.
 */
export function evaluateThreeWayMatch(
	input: ThreeWayMatchInput,
): Result<{ evidence: ThreeWayMatchEvidence; status: ThreeWayMatchStatus }> {
	const validated = validateThreeWayMatchInput(input);
	if (!validated.ok) {
		return validated;
	}
	const aggregates = aggregateThreeWayMatchFacts(validated.data);
	const variances = calculateThreeWayMatchVariances(aggregates);
	return errorResult.ok(classifyThreeWayMatch({ aggregates, variances }));
}

function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(TRAILING_ZERO_PATTERN, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}
