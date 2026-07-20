import { z } from "zod";

export const deliveryIdSchema = z.string().uuid().brand<"DeliveryId">();
export type DeliveryId = z.infer<typeof deliveryIdSchema>;

export const deliveryLineIdSchema = z.string().uuid().brand<"DeliveryLineId">();
export type DeliveryLineId = z.infer<typeof deliveryLineIdSchema>;

export const deliveryPickIdSchema = z.string().uuid().brand<"DeliveryPickId">();
export type DeliveryPickId = z.infer<typeof deliveryPickIdSchema>;

export const deliveryPackIdSchema = z.string().uuid().brand<"DeliveryPackId">();
export type DeliveryPackId = z.infer<typeof deliveryPackIdSchema>;

export const proofOfDeliveryIdSchema = z
	.string()
	.uuid()
	.brand<"ProofOfDeliveryId">();
export type ProofOfDeliveryId = z.infer<typeof proofOfDeliveryIdSchema>;
