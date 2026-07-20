import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
	PurchaseOrderReceivingStatus,
} from "./ports";
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
		return fail("CONFLICT", statusConflictMessage(snapshot.status));
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
 * Post path — revalidate posted status, require PO line binding,
 * enforce thisReceived + alreadyReceived ≤ ordered × (1 + tol/100).
 */
export function assertPurchaseOrderReceivableForPost(
	snapshot: PurchaseOrderReceivingSnapshot,
	lines: ReadonlyArray<
		Pick<GoodsReceiptLine, "purchaseOrderLineId" | "quantityReceived">
	>,
): Result<true> {
	if (snapshot.status !== "posted") {
		return fail("CONFLICT", statusConflictMessage(snapshot.status));
	}

	const byLineId = new Map(
		snapshot.lines.map((line) => [line.purchaseOrderLineId, line]),
	);
	const receivedThisReceipt = new Map<string, number>();

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
		const qty = Number(line.quantityReceived);
		if (!Number.isFinite(qty)) {
			return fail("CONFLICT", "Invalid received quantity");
		}
		receivedThisReceipt.set(
			line.purchaseOrderLineId,
			(receivedThisReceipt.get(line.purchaseOrderLineId) ?? 0) + qty,
		);
	}

	for (const [lineId, thisReceived] of receivedThisReceipt) {
		const poLine = byLineId.get(lineId);
		if (poLine === undefined) {
			return fail("NOT_FOUND", "Purchase order line not found");
		}
		const alreadyReceived = Number(poLine.received);
		const ceiling = receiptCeiling(
			poLine.ordered,
			poLine.overReceiptTolerancePercent,
		);
		if (!Number.isFinite(alreadyReceived) || !Number.isFinite(ceiling)) {
			return fail("CONFLICT", "Invalid purchase order quantity snapshot");
		}
		if (alreadyReceived + thisReceived > ceiling) {
			return fail(
				"CONFLICT",
				"Received quantity exceeds remaining quantity plus over-receipt tolerance",
			);
		}
	}

	return ok(true);
}
