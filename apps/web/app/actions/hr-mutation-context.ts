import { z } from "zod";

export const hrMutationContextSchema = z.object({
	correlationId: z.string().trim().min(1).max(128).optional(),
});

/** Package mutation schemas include server-stamped fields — omit at the Action boundary. */
export const hrServerContextOmit = {
	organizationId: true,
	actorUserId: true,
	correlationId: true,
} as const;

export function hrActionSchema<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
	return hrMutationContextSchema.merge(schema.omit(hrServerContextOmit));
}

export function withHrSessionContext<T extends Record<string, unknown>>(
	session: { orgId: string; userId: string },
	correlationId: string,
	data: T,
) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId: data.correlationId ?? correlationId,
		...data,
	};
}
