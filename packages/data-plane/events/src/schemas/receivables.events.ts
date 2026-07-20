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
	"receivables.invoice.cancelled.v1": receivablesPayloadSchema,
	"receivables.invoice.closed.v1": receivablesPayloadSchema,
	"receivables.credit_note.posted.v1": receivablesPayloadSchema,
	"receivables.allocation.posted.v1": receivablesPayloadSchema,
	"receivables.allocation.reversed.v1": receivablesPayloadSchema,
	"receivables.receipt_application.posted.v1": receivablesPayloadSchema,
	"receivables.receipt_application.reversed.v1": receivablesPayloadSchema,
} as const;

export type ReceivablesEventType = keyof typeof ReceivablesEventSchemas;

export const RECEIVABLES_INVOICE_CREATED_EVENT =
	"receivables.invoice.created.v1" as const;
export const RECEIVABLES_INVOICE_POSTED_EVENT =
	"receivables.invoice.posted.v1" as const;
export const RECEIVABLES_INVOICE_CANCELLED_EVENT =
	"receivables.invoice.cancelled.v1" as const;
export const RECEIVABLES_INVOICE_CLOSED_EVENT =
	"receivables.invoice.closed.v1" as const;
export const RECEIVABLES_CREDIT_NOTE_POSTED_EVENT =
	"receivables.credit_note.posted.v1" as const;
export const RECEIVABLES_ALLOCATION_POSTED_EVENT =
	"receivables.allocation.posted.v1" as const;
export const RECEIVABLES_ALLOCATION_REVERSED_EVENT =
	"receivables.allocation.reversed.v1" as const;
export const RECEIVABLES_RECEIPT_APPLICATION_POSTED_EVENT =
	"receivables.receipt_application.posted.v1" as const;
export const RECEIVABLES_RECEIPT_APPLICATION_REVERSED_EVENT =
	"receivables.receipt_application.reversed.v1" as const;

export const RECEIVABLES_EVENT_IDS = [
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
	RECEIVABLES_INVOICE_CANCELLED_EVENT,
	RECEIVABLES_INVOICE_CLOSED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_REVERSED_EVENT,
	RECEIVABLES_RECEIPT_APPLICATION_POSTED_EVENT,
	RECEIVABLES_RECEIPT_APPLICATION_REVERSED_EVENT,
] as const satisfies readonly ReceivablesEventType[];
