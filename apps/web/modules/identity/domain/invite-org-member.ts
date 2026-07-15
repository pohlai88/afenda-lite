import { z } from "zod";

/**
 * Identity — invite command shape for Neon Auth org membership
 * (ARCH-026 · GUIDE-018 I1.3). Adapter stamps `orgId` from session;
 * this port never trusts URL org alone.
 */

export const inviteOrgMemberCommandSchema = z.object({
	email: z
		.string()
		.trim()
		.pipe(z.email())
		.transform((value) => value.toLowerCase()),
	role: z.enum(["admin", "operator", "client"]),
});

export type InviteOrgMemberCommand = z.infer<
	typeof inviteOrgMemberCommandSchema
>;

export function parseInviteOrgMemberCommand(
	raw: unknown,
): InviteOrgMemberCommand {
	return inviteOrgMemberCommandSchema.parse(raw);
}
