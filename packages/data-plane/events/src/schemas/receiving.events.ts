import { z } from "zod";

const goodsReceiptPayloadBase = z
	.object({
		organizationId: z.string().trim().min(1),
		entityType: z.literal("goods_receipt"),
		entityId: z.string().trim().min(1),
		code: z.string().trim().min(1),
		version: z.number().int().positive(),
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
		changedPaths: z.array(z.string().trim().min(1)).optional(),
		status: z.string().trim().min(1),
		sourceType: z.string().trim().min(1),
		warehouseId: z.string().uuid(),
	})
	.strict();

export const goodsReceiptPayloadSchema = goodsReceiptPayloadBase;

export type GoodsReceiptPayload = z.infer<typeof goodsReceiptPayloadSchema>;

export const goodsReceiptLinePayloadSchema = goodsReceiptPayloadBase.extend({
	entityType: z.literal("goods_receipt_line"),
	receiptId: z.string().uuid(),
	lineNo: z.number().int().positive(),
	quantity: z.string().trim().min(1),
});

export type GoodsReceiptLinePayload = z.infer<
	typeof goodsReceiptLinePayloadSchema
>;

export const receivingDiscrepancyPayloadSchema = goodsReceiptPayloadBase.extend(
	{
		entityType: z.literal("receiving_discrepancy"),
		receiptId: z.string().uuid(),
		discrepancyType: z.string().trim().min(1),
		quantity: z.string().trim().min(1),
	},
);

export type ReceivingDiscrepancyPayload = z.infer<
	typeof receivingDiscrepancyPayloadSchema
>;

export const ReceivingEventSchemas = {
	"receiving.receipt.created.v1": goodsReceiptPayloadSchema,
	"receiving.receipt.line_added.v1": goodsReceiptLinePayloadSchema,
	"receiving.receipt.posted.v1": goodsReceiptPayloadSchema,
	"receiving.discrepancy.recorded.v1": receivingDiscrepancyPayloadSchema,
} as const;

export type ReceivingEventType = keyof typeof ReceivingEventSchemas;

export const RECEIVING_RECEIPT_CREATED_EVENT =
	"receiving.receipt.created.v1" as const;
export const RECEIVING_RECEIPT_LINE_ADDED_EVENT =
	"receiving.receipt.line_added.v1" as const;
export const RECEIVING_RECEIPT_POSTED_EVENT =
	"receiving.receipt.posted.v1" as const;
export const RECEIVING_DISCREPANCY_RECORDED_EVENT =
	"receiving.discrepancy.recorded.v1" as const;

export const RECEIVING_EVENT_IDS = [
	RECEIVING_RECEIPT_CREATED_EVENT,
	RECEIVING_RECEIPT_LINE_ADDED_EVENT,
	RECEIVING_RECEIPT_POSTED_EVENT,
	RECEIVING_DISCREPANCY_RECORDED_EVENT,
] as const satisfies readonly ReceivingEventType[];
