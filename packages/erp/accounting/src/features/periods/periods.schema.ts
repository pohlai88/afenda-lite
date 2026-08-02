import { z } from "zod";

export const OpenAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	startDate: z.string(),
	endDate: z.string(),
});

export const SoftCloseAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export const CloseAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	closeReason: z.string().max(500).nullable().default(null),
});

export const ReopenAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	reason: z.string().min(1).max(500),
});
