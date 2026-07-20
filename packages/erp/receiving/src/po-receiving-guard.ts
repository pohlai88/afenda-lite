import { fail, ok, type Result } from "@afenda/errors/result";

import {
	RECEIVING_ERROR_PURCHASE_ORDER_NOT_RECEIVABLE,
	RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE,
	receivingErrorDetails,
} from "./error-codes";
import type {
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
	PurchaseOrderReceivingStatus,
} from "./ports";
import type { PoConsumptionGuard } from "./store";
import type { GoodsReceiptLine } from "./types";

const PO_NOT_FOUND_MESSAGE = "Purchase order not found";

function statusConflictMessage(status: PurchaseOrderReceivingStatus): string {
	switch (status) {
		case "draft":
			return "Purchase order must be posted before receiving";
		case "closed":
			return "Purchase order is closed";
		case "cancelled":
			return "Purchase order is cancelled";
		case "posted":
			return "Purchase order must be posted before receiving";
		default: {
			const _exhaustive: never = status;
			return _exhaustive;
		}
	}
}

export async function loadPurchaseOrderReceivingSnapshot(
	port: PurchaseOrderReceivingQueryPort | undefined,
	input: { organizationId: string; purchaseOrderId: string },
): Promise<Result<PurchaseOrderReceivingSnapshot>> {
	if (port === undefined) {
		return fail(
			"INTERNAL_ERROR",
			"Purchase order receiving query port is required",
		);
	}
	const snapshot = await port.getReceivingSnapshot(input);
	if (!snapshot.ok) return snapshot;
	if (snapshot.data === null) {
		return fail("NOT_FOUND", PO_NOT_FOUND_MESSAGE);
	}
	return ok(snapshot.data);
}

/** Create path — existence/org + posted status only. */
export function assertPurchaseOrderPostedForCreate(
	snapshot: PurchaseOrderReceivingSnapshot,
): Result<true> {
	if (snapshot.status !== "posted") {
		return fail(
			"CONFLICT",
			statusConflictMessage(snapshot.status),
			receivingErrorDetails(RECEIVING_ERROR_PURCHASE_ORDER_NOT_RECEIVABLE),
		);
	}
	return ok(true);
}

function receiptCeiling(ordered: string, tolerancePercent: string): number {
	const orderedQty = Number(ordered);
	const tolerance = Number(tolerancePercent);
	if (!Number.isFinite(orderedQty) || !Number.isFinite(tolerance)) {
		return Number.NaN;
	}
	return orderedQty * (1 + tolerance / 100);
}

/**
 * Build store-level PO consumption guard (this-receipt accepted + ceiling per line).
 * Does not include already-posted accepted qty — that is re-summed under lock in TX.
 */
export function buildPoConsumptionGuard(
	purchaseOrderId: string,
	snapshot: PurchaseOrderReceivingSnapshot,
	lines: ReadonlyArray<
		Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantityAccepted">
	>,
): Result<PoConsumptionGuard> {
	if (snapshot.status !== "posted") {
		return fail(
			"CONFLICT",
			statusConflictMessage(snapshot.status),
			receivingErrorDetails(RECEIVING_ERROR_PURCHASE_ORDER_NOT_RECEIVABLE),
		);
	}

	const byLineId = new Map(
		snapshot.lines.map((line) => [line.purchaseOrderLineId, line]),
	);
	const acceptedThisReceipt = new Map<string, number>();

	for (const line of lines) {
		if (line.purchaseOrderLineId === null) {
			return fail(
				"CONFLICT",
				"Purchase order line id is required on purchase_order receipt lines",
			);
		}
		const poLine = byLineId.get(line.purchaseOrderLineId);
		if (poLine === undefined) {
			return fail("NOT_FOUND", "Purchase order line not found");
		}
		const qty = Number(line.quantityAccepted);
		if (!Number.isFinite(qty)) {
			return fail("CONFLICT", "Invalid accepted quantity");
		}
		acceptedThisReceipt.set(
			line.purchaseOrderLineId,
			(acceptedThisReceipt.get(line.purchaseOrderLineId) ?? 0) + qty,
		);
	}

	const guardLines: PoConsumptionGuard["lines"] = [];
	for (const [lineId, thisAccepted] of acceptedThisReceipt) {
		const poLine = byLineId.get(lineId);
		if (poLine === undefined) {
			return fail("NOT_FOUND", "Purchase order line not found");
		}
		const ceiling = receiptCeiling(
			poLine.ordered,
			poLine.overReceiptTolerancePercent,
		);
		if (!Number.isFinite(ceiling)) {
			return fail("CONFLICT", "Invalid purchase order quantity snapshot");
		}
		guardLines.push({
			purchaseOrderLineId: lineId,
			thisAccepted,
			ceiling,
		});
	}

	return ok({
		purchaseOrderId,
		lines: guardLines,
	});
}

export function assertAcceptedWithinPoCeilings(
	guard: PoConsumptionGuard,
	alreadyAcceptedByLine: ReadonlyMap<string, number>,
): Result<true> {
	for (const line of guard.lines) {
		const alreadyAccepted =
			alreadyAcceptedByLine.get(line.purchaseOrderLineId) ?? 0;
		if (!Number.isFinite(alreadyAccepted)) {
			return fail("CONFLICT", "Invalid purchase order quantity snapshot");
		}
		if (alreadyAccepted + line.thisAccepted > line.ceiling) {
			return fail(
				"CONFLICT",
				"Accepted quantity exceeds remaining quantity plus over-receipt tolerance",
				receivingErrorDetails(RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE),
			);
		}
	}
	return ok(true);
}

/**
 * Post path — revalidate posted status, require PO line binding,
 * enforce thisAccepted + alreadyAccepted ≤ ordered × (1 + tol/100).
 * `alreadyAcceptedByLine` is Receiving-owned posted accepted qty (excludes reversed).
 */
export function assertPurchaseOrderReceivableForPost(
	purchaseOrderId: string,
	snapshot: PurchaseOrderReceivingSnapshot,
	lines: ReadonlyArray<
		Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantityAccepted">
	>,
	alreadyAcceptedByLine: ReadonlyMap<string, number>,
): Result<true> {
	const guard = buildPoConsumptionGuard(purchaseOrderId, snapshot, lines);
	if (!guard.ok) return guard;
	return assertAcceptedWithinPoCeilings(guard.data, alreadyAcceptedByLine);
}
