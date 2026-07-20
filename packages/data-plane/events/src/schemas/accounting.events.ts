import { z } from "zod";

export const accountingPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		entityId: z.string().uuid(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

export type AccountingPayload = z.infer<typeof accountingPayloadSchema>;

export const accountingJournalPayloadSchema = accountingPayloadSchema.extend({
	periodId: z.string().uuid(),
	code: z.string().trim().min(1),
	reversalOfJournalId: z.string().uuid().nullable(),
	lines: z
		.array(
			z
				.object({
					accountCode: z.string().trim().min(1),
					debit: z.string().trim().min(1),
					credit: z.string().trim().min(1),
				})
				.strict(),
		)
		.optional(),
});

export const AccountingEventSchemas = {
	"accounting.journal.created.v1": accountingPayloadSchema,
	"accounting.journal.posted.v1": accountingJournalPayloadSchema,
	"accounting.journal.reversed.v1": accountingJournalPayloadSchema.extend({
		reversalPostingIds: z.array(z.string().uuid()).min(1),
		reason: z.string().trim().min(1),
	}),
	"accounting.period.closed.v1": accountingPayloadSchema,
} as const;

export type AccountingEventType = keyof typeof AccountingEventSchemas;

export const ACCOUNTING_JOURNAL_CREATED_EVENT =
	"accounting.journal.created.v1" as const;
export const ACCOUNTING_JOURNAL_POSTED_EVENT =
	"accounting.journal.posted.v1" as const;
export const ACCOUNTING_JOURNAL_REVERSED_EVENT =
	"accounting.journal.reversed.v1" as const;
export const ACCOUNTING_PERIOD_CLOSED_EVENT =
	"accounting.period.closed.v1" as const;

export const ACCOUNTING_EVENT_IDS = [
	ACCOUNTING_JOURNAL_CREATED_EVENT,
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	ACCOUNTING_JOURNAL_REVERSED_EVENT,
	ACCOUNTING_PERIOD_CLOSED_EVENT,
] as const satisfies readonly AccountingEventType[];
