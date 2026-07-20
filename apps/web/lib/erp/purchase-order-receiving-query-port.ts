import {
	and,
	db,
	eq,
	goodsReceipt,
	goodsReceiptLine,
	inArray,
	purchaseOrder,
	purchaseOrderLine,
	sql,
} from "@afenda/db";
import { failFromUnknown, ok, type Result } from "@afenda/errors/result";
import type {
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
	PurchaseOrderReceivingStatus,
} from "@afenda/receiving";

function asReceivingStatus(status: string): PurchaseOrderReceivingStatus {
	switch (status) {
		case "draft":
		case "posted":
		case "cancelled":
		case "closed":
			return status;
		default:
			return "draft";
	}
}

/**
 * Composition-root SQL adapter — receiving package only sees the port interface.
 * Reads purchase_order / lines + posted|closed goods receipts; no @afenda/purchasing import.
 */
export function createPurchaseOrderReceivingQueryPort(): PurchaseOrderReceivingQueryPort {
	return {
		async getReceivingSnapshot(input: {
			organizationId: string;
			purchaseOrderId: string;
		}): Promise<Result<PurchaseOrderReceivingSnapshot | null>> {
			try {
				const [order] = await db
					.select({
						id: purchaseOrder.id,
						status: purchaseOrder.status,
						version: purchaseOrder.version,
					})
					.from(purchaseOrder)
					.where(
						and(
							eq(purchaseOrder.organizationId, input.organizationId),
							eq(purchaseOrder.id, input.purchaseOrderId),
						),
					)
					.limit(1);

				if (order === undefined) {
					return ok(null);
				}

				const lines = await db
					.select({
						id: purchaseOrderLine.id,
						quantity: purchaseOrderLine.quantity,
						overReceiptPercent: purchaseOrderLine.overReceiptPercent,
					})
					.from(purchaseOrderLine)
					.where(
						and(
							eq(purchaseOrderLine.organizationId, input.organizationId),
							eq(purchaseOrderLine.orderId, input.purchaseOrderId),
						),
					);

				const receiptHeaders = await db
					.select({ id: goodsReceipt.id })
					.from(goodsReceipt)
					.where(
						and(
							eq(goodsReceipt.organizationId, input.organizationId),
							eq(goodsReceipt.sourceType, "purchase_order"),
							eq(goodsReceipt.sourceId, input.purchaseOrderId),
							inArray(goodsReceipt.status, ["posted", "closed"]),
						),
					);

				const receiptIds = receiptHeaders.map((row) => row.id);
				const receivedByLineId = new Map<string, string>();
				if (receiptIds.length > 0 && lines.length > 0) {
					const receivedRows = await db
						.select({
							purchaseOrderLineId: goodsReceiptLine.purchaseOrderLineId,
							receivedQuantity: sql<string>`coalesce(sum(${goodsReceiptLine.quantityReceived}::numeric), 0)::text`,
						})
						.from(goodsReceiptLine)
						.where(
							and(
								eq(goodsReceiptLine.organizationId, input.organizationId),
								inArray(goodsReceiptLine.goodsReceiptId, receiptIds),
							),
						)
						.groupBy(goodsReceiptLine.purchaseOrderLineId);

					for (const row of receivedRows) {
						if (row.purchaseOrderLineId !== null) {
							receivedByLineId.set(
								row.purchaseOrderLineId,
								row.receivedQuantity,
							);
						}
					}
				}

				return ok({
					status: asReceivingStatus(order.status),
					version: order.version,
					lines: lines.map((line) => {
						const ordered = String(line.quantity);
						const received = receivedByLineId.get(line.id) ?? "0";
						const remaining = String(
							Math.max(0, Number(ordered) - Number(received)),
						);
						return {
							purchaseOrderLineId: line.id,
							ordered,
							received,
							remaining,
							overReceiptTolerancePercent: line.overReceiptPercent,
						};
					}),
				});
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load purchase order receiving snapshot",
				);
			}
		},
	};
}
