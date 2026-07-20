import { z } from "zod";

/** Explicit org + actor context — never ambient / header tenancy. */
export const orgActorContextSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
});

export type OrgActorContext = z.infer<typeof orgActorContextSchema>;

/** Org-scoped read context — actor required for authorization port checks. */
export const orgQueryActorSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
});

export type OrgQueryActor = z.infer<typeof orgQueryActorSchema>;
