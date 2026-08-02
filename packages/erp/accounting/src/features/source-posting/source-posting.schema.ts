import { z } from "zod";

export const UpsertPostingProfileInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	eventType: z.string().min(1).max(100),
	versionNumber: z.number().int().positive(),
	lines: z
		.array(
			z.object({
				lineNo: z.number().int().positive(),
				side: z.enum(["debit", "credit"]),
				accountRole: z.string().min(1).max(100),
			}),
		)
		.min(1),
});

export const PostFinancialSourceEventInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	sourceModule: z.string().min(1).max(100),
	sourceAggregateId: z.string().min(1),
	sourceEventId: z.string().min(1),
	sourceEventVersion: z.number().int().positive(),
	postingRuleCode: z.string().min(1).max(50),
	periodId: z.string().uuid(),
	currencyCode: z.string().length(3),
	description: z.string().max(500).nullable().default(null),
	amountByRole: z.record(z.string(), z.string()),
});

export const GetSourcePostingTraceInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	journalId: z.string().uuid().optional(),
	sourceModule: z.string().optional(),
	sourceAggregateId: z.string().optional(),
	sourceEventId: z.string().optional(),
});

export const ListPostingExceptionsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	status: z.enum(["open", "resolved", "retrying"]).optional(),
});

export const ResolvePostingExceptionInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	resolutionNote: z.string().min(1).max(1000),
	expectedVersion: z.number().int().positive(),
});
