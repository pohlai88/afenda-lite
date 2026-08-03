import { z } from "zod";

export const purchaseOrderIdSchema = z
	.string()
	.uuid()
	.brand<"PurchaseOrderId">();
export type PurchaseOrderId = z.infer<typeof purchaseOrderIdSchema>;

export const purchaseOrderLineIdSchema = z
	.string()
	.uuid()
	.brand<"PurchaseOrderLineId">();
export type PurchaseOrderLineId = z.infer<typeof purchaseOrderLineIdSchema>;
