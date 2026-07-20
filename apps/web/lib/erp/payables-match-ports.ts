import { fail, ok, type Result } from "@afenda/errors/result";
import type {
	GoodsReceiptMatchBasis,
	GoodsReceiptMatchQueryPort,
	PurchaseOrderMatchBasis,
	PurchaseOrderMatchQueryPort,
} from "@afenda/payables";
import { getPurchaseOrderById } from "@afenda/purchasing";
import { getGoodsReceiptById } from "@afenda/receiving";

import { createPurchasingCommandOptions } from "@/lib/erp/purchasing-command-options";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";

/**
 * Composition-root PO match adapter — Payables never queries purchasing tables.
 */
export function createPurchaseOrderMatchQueryPort(
	actorUserId: string,
): PurchaseOrderMatchQueryPort {
	return {
		async getPurchaseOrderMatchBasis(input: {
			organizationId: string;
			purchaseOrderId: string;
		}): Promise<Result<PurchaseOrderMatchBasis | null>> {
			const result = await getPurchaseOrderById(
				{
					organizationId: input.organizationId,
					actorUserId,
					id: input.purchaseOrderId,
				},
				createPurchasingCommandOptions(),
			);
			if (!result.ok) return result;
			if (result.data === null) return ok(null);
			const order = result.data;
			return ok({
				purchaseOrderId: order.id,
				supplierPartyId: order.partyId,
				status: order.status,
				currencyCode: order.currencyCode,
				version: order.version,
				lines: order.lines.map((line) => ({
					itemId: line.itemId,
					quantity: line.quantity,
					unitPrice: line.unitPrice,
				})),
			});
		},
	};
}

/**
 * Composition-root GR match adapter — Payables never queries receiving tables.
 */
export function createGoodsReceiptMatchQueryPort(
	actorUserId: string,
): GoodsReceiptMatchQueryPort {
	return {
		async getGoodsReceiptMatchBasis(input: {
			organizationId: string;
			goodsReceiptId: string;
		}): Promise<Result<GoodsReceiptMatchBasis | null>> {
			const result = await getGoodsReceiptById(
				{
					organizationId: input.organizationId,
					actorUserId,
					id: input.goodsReceiptId,
				},
				createReceivingCommandOptions(),
			);
			if (!result.ok) return result;
			if (result.data === null) return ok(null);
			const receipt = result.data;
			if (
				receipt.sourceType !== "purchase_order" ||
				receipt.sourceId === null
			) {
				return fail(
					"CONFLICT",
					"Goods receipt must be sourced from a purchase order",
				);
			}
			return ok({
				goodsReceiptId: receipt.id,
				purchaseOrderId: receipt.sourceId,
				status: receipt.status,
				sourceType: receipt.sourceType,
				sourceId: receipt.sourceId,
				version: receipt.version,
				lines: receipt.lines.map((line) => ({
					itemId: line.itemId,
					quantityReceived: line.quantityReceived,
				})),
			});
		},
	};
}
