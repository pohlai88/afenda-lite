import { z } from "zod";

export const payablesPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		entityId: z.string().uuid(),
		supplierId: z.string().uuid(),
		amount: z.string().trim().min(1),
		currencyCode: z.string().trim().length(3),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

export type PayablesPayload = z.infer<typeof payablesPayloadSchema>;

export const PayablesEventSchemas = {
	"payables.invoice.created.v1": payablesPayloadSchema,
	"payables.invoice.matched.v1": payablesPayloadSchema,
	"payables.invoice.posted.v1": payablesPayloadSchema,
	"payables.credit_note.posted.v1": payablesPayloadSchema,
	"payables.allocation.posted.v1": payablesPayloadSchema,
} as const;

export type PayablesEventType = keyof typeof PayablesEventSchemas;

export const PAYABLES_INVOICE_CREATED_EVENT =
	"payables.invoice.created.v1" as const;
export const PAYABLES_INVOICE_MATCHED_EVENT =
	"payables.invoice.matched.v1" as const;
export const PAYABLES_INVOICE_POSTED_EVENT =
	"payables.invoice.posted.v1" as const;
export const PAYABLES_CREDIT_NOTE_POSTED_EVENT =
	"payables.credit_note.posted.v1" as const;
export const PAYABLES_ALLOCATION_POSTED_EVENT =
	"payables.allocation.posted.v1" as const;

export const PAYABLES_EVENT_IDS = [
	PAYABLES_INVOICE_CREATED_EVENT,
	PAYABLES_INVOICE_MATCHED_EVENT,
	PAYABLES_INVOICE_POSTED_EVENT,
	PAYABLES_CREDIT_NOTE_POSTED_EVENT,
	PAYABLES_ALLOCATION_POSTED_EVENT,
] as const satisfies readonly PayablesEventType[];
