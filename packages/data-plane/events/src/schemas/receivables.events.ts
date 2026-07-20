import { z } from "zod";

export const receivablesPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		entityId: z.string().uuid(),
		customerId: z.string().uuid(),
		amount: z.string().trim().min(1),
		currencyCode: z.string().trim().length(3),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

export type ReceivablesPayload = z.infer<typeof receivablesPayloadSchema>;

export const ReceivablesEventSchemas = {
	"receivables.invoice.created.v1": receivablesPayloadSchema,
	"receivables.invoice.posted.v1": receivablesPayloadSchema,
	"receivables.credit_note.posted.v1": receivablesPayloadSchema,
	"receivables.allocation.posted.v1": receivablesPayloadSchema,
} as const;

export type ReceivablesEventType = keyof typeof ReceivablesEventSchemas;

export const RECEIVABLES_INVOICE_CREATED_EVENT =
	"receivables.invoice.created.v1" as const;
export const RECEIVABLES_INVOICE_POSTED_EVENT =
	"receivables.invoice.posted.v1" as const;
export const RECEIVABLES_CREDIT_NOTE_POSTED_EVENT =
	"receivables.credit_note.posted.v1" as const;
export const RECEIVABLES_ALLOCATION_POSTED_EVENT =
	"receivables.allocation.posted.v1" as const;

export const RECEIVABLES_EVENT_IDS = [
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
] as const satisfies readonly ReceivablesEventType[];
