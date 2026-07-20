import { z } from "zod";

export const paymentPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		entityId: z.string().uuid(),
		direction: z.enum(["receipt", "disbursement", "refund", "transfer"]),
		counterpartyId: z.string().uuid().nullable(),
		amount: z.string().trim().min(1),
		currencyCode: z.string().trim().length(3),
		allocations: z.array(
			z
				.object({
					targetType: z.enum(["receivable", "payable"]),
					targetId: z.string().uuid(),
					amount: z.string().trim().min(1),
				})
				.strict(),
		),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

export type PaymentPayload = z.infer<typeof paymentPayloadSchema>;

export const PaymentsEventSchemas = {
	"payments.payment.created.v1": paymentPayloadSchema,
	"payments.payment.posted.v1": paymentPayloadSchema,
	"payments.payment.reversed.v1": paymentPayloadSchema.extend({
		reversalId: z.string().uuid(),
		reason: z.string().trim().min(1),
	}),
	"payments.refund.posted.v1": paymentPayloadSchema.extend({
		originalPaymentId: z.string().uuid(),
	}),
} as const;

export type PaymentsEventType = keyof typeof PaymentsEventSchemas;

export const PAYMENTS_PAYMENT_CREATED_EVENT =
	"payments.payment.created.v1" as const;
export const PAYMENTS_PAYMENT_POSTED_EVENT =
	"payments.payment.posted.v1" as const;
export const PAYMENTS_PAYMENT_REVERSED_EVENT =
	"payments.payment.reversed.v1" as const;
export const PAYMENTS_REFUND_POSTED_EVENT =
	"payments.refund.posted.v1" as const;

export const PAYMENTS_EVENT_IDS = [
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
] as const satisfies readonly PaymentsEventType[];
