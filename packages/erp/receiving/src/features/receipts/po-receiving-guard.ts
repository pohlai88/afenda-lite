import { errorResult, type Result } from "@afenda/errors";
import type { GoodsReceiptLine } from "../../kernel/contracts/domain";
import type {
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
	PurchaseOrderReceivingStatus,
} from "../../kernel/contracts/ports";
import type { PoConsumptionGuard } from "./receipts.store";

const _PO_NOT_FOUND_MESSAGE = "Purchase order not found";

function _statusConflictMessage(status: PurchaseOrderReceivingStatus): string {
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
		return errorResult.fail("INTERNAL_ERROR");
	}
	const snapshot = await port.getReceivingSnapshot(input);
	if (!snapshot.ok) {
		return snapshot;
	}
	if (snapshot.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
	}
	return errorResult.ok(snapshot.data);
}

/** Create path — existence/org + posted status only. */
export function assertPurchaseOrderPostedForCreate(
	snapshot: PurchaseOrderReceivingSnapshot,
): Result<true> {
	if (snapshot.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	return errorResult.ok(true);
}

function receiptCeiling(ordered: string, tolerancePercent: string): number {
	const orderedQty = Number(ordered);
	const tolerance = Number(tolerancePercent);
	if (!(Number.isFinite(orderedQty) && Number.isFinite(tolerance))) {
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
	lines: readonly Pick<
		GoodsReceiptLine,
		"purchaseOrderLineId" | "quantityAccepted"
	>[],
): Result<PoConsumptionGuard> {
	if (snapshot.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}

	const byLineId = new Map(
		snapshot.lines.map((line) => [line.purchaseOrderLineId, line]),
	);
	const acceptedThisReceipt = new Map<string, number>();

	for (const line of lines) {
		if (line.purchaseOrderLineId === null) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage:
					"Purchase order line id is required on purchase_order receipt lines",
			});
		}
		const poLine = byLineId.get(line.purchaseOrderLineId);
		if (poLine === undefined) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order line not found",
			});
		}
		const qty = Number(line.quantityAccepted);
		if (!Number.isFinite(qty)) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Invalid accepted quantity",
			});
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
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order line not found",
			});
		}
		const ceiling = receiptCeiling(
			poLine.ordered,
			poLine.overReceiptTolerancePercent,
		);
		if (!Number.isFinite(ceiling)) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Invalid purchase order quantity snapshot",
			});
		}
		guardLines.push({
			purchaseOrderLineId: lineId,
			thisAccepted,
			ceiling,
		});
	}

	return errorResult.ok({
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
			return errorResult.fail("CONFLICT", {
				publicMessage: "Invalid purchase order quantity snapshot",
			});
		}
		if (alreadyAccepted + line.thisAccepted > line.ceiling) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Accepted quantity exceeds remaining quantity plus over-receipt tolerance",
			});
		}
	}
	return errorResult.ok(true);
}

/**
 * Post path — revalidate posted status, require PO line binding,
 * enforce thisAccepted + alreadyAccepted ≤ ordered × (1 + tol/100).
 * `alreadyAcceptedByLine` is Receiving-owned posted accepted qty (excludes reversed).
 */
export function assertPurchaseOrderReceivableForPost(
	purchaseOrderId: string,
	snapshot: PurchaseOrderReceivingSnapshot,
	lines: readonly Pick<
		GoodsReceiptLine,
		"purchaseOrderLineId" | "quantityAccepted"
	>[],
	alreadyAcceptedByLine: ReadonlyMap<string, number>,
): Result<true> {
	const guard = buildPoConsumptionGuard(purchaseOrderId, snapshot, lines);
	if (!guard.ok) {
		return guard;
	}
	return assertAcceptedWithinPoCeilings(guard.data, alreadyAcceptedByLine);
}
