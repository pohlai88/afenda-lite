import { z } from "zod";

export const CreateDraftJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	code: z.string().min(1).max(50),
	currencyCode: z.string().length(3),
	description: z.string().max(500).nullable().default(null),
	journalType: z
		.enum([
			"manual",
			"receivables",
			"payables",
			"payments",
			"inventory",
			"opening_balance",
			"adjustment",
			"reversal",
			"system",
		])
		.default("manual"),
});

export const AddJournalLineInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	accountCode: z.string().min(1).max(50),
	description: z.string().max(500).nullable().default(null),
	debit: z.string(),
	credit: z.string(),
});

export const PostJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export const ReverseJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	reason: z.string().min(1).max(500),
});

export const GetJournalByIdInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	journalId: z.string().uuid(),
});

export const ListJournalsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	status: z.enum(["draft", "posted", "reversed"]).optional(),
	periodId: z.string().uuid().optional(),
});

export const GetTrialBalanceInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	periodId: z.string().uuid().optional(),
});

export const GetLedgerAccountActivityInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	accountCode: z.string().optional(),
	periodId: z.string().uuid().optional(),
});
