import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ingestApprovedPayrollHandoffInputSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1).max(128),
	periodStart: isoDate.nullable().default(null),
	periodEnd: isoDate.nullable().default(null),
	/** HR-produced versioned payload, carried unchanged; Payroll owns parsing. */
	payload: z.unknown(),
});
