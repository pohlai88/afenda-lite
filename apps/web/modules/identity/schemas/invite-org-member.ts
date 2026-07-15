import { z } from "zod";

import { emailSchema } from "@/modules/platform/schemas/common";

/**
 * Identity — invite command Zod SSOT (API-004 · GUIDE-018 I1.3 / I2.1).
 * Adapter stamps `orgId` from session; never trust a client-supplied org.
 */

export const inviteOrgMemberCommandSchema = z.object({
	email: emailSchema,
	role: z.enum(["admin", "operator", "client"]),
});

export type InviteOrgMemberCommand = z.infer<
	typeof inviteOrgMemberCommandSchema
>;

/** Throw-on-invalid helper for domain/unit tests; adapters prefer `parseSchema`. */
export function parseInviteOrgMemberCommand(
	raw: unknown,
): InviteOrgMemberCommand {
	return inviteOrgMemberCommandSchema.parse(raw);
}
