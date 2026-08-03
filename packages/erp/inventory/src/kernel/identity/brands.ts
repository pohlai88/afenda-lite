import { z } from "zod";

export const stockMovementIdSchema = z
	.string()
	.uuid()
	.brand<"StockMovementId">();
export type StockMovementId = z.infer<typeof stockMovementIdSchema>;

export const stockMovementLineIdSchema = z
	.string()
	.uuid()
	.brand<"StockMovementLineId">();
export type StockMovementLineId = z.infer<typeof stockMovementLineIdSchema>;

export const stockReservationIdSchema = z
	.string()
	.uuid()
	.brand<"StockReservationId">();
export type StockReservationId = z.infer<typeof stockReservationIdSchema>;

export const stockBalanceIdSchema = z.string().uuid().brand<"StockBalanceId">();
export type StockBalanceId = z.infer<typeof stockBalanceIdSchema>;
