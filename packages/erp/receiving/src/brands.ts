import { z } from "zod";

export const goodsReceiptIdSchema = z.string().uuid().brand<"GoodsReceiptId">();
export type GoodsReceiptId = z.infer<typeof goodsReceiptIdSchema>;

export const goodsReceiptLineIdSchema = z
	.string()
	.uuid()
	.brand<"GoodsReceiptLineId">();
export type GoodsReceiptLineId = z.infer<typeof goodsReceiptLineIdSchema>;

export const receivingDiscrepancyIdSchema = z
	.string()
	.uuid()
	.brand<"ReceivingDiscrepancyId">();
export type ReceivingDiscrepancyId = z.infer<
	typeof receivingDiscrepancyIdSchema
>;
