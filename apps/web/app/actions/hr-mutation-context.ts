import { z } from "zod";

export const hrMutationContextSchema = z.object({
	correlationId: z.string().trim().min(1).max(128).optional(),
});

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
