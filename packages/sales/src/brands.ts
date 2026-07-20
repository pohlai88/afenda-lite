import { z } from "zod";

export const salesOrderIdSchema = z.string().uuid().brand<"SalesOrderId">();
export type SalesOrderId = z.infer<typeof salesOrderIdSchema>;

export const salesOrderLineIdSchema = z
	.string()
	.uuid()
	.brand<"SalesOrderLineId">();
export type SalesOrderLineId = z.infer<typeof salesOrderLineIdSchema>;
