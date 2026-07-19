import { z } from "zod";

export const identityOrgRoleAssignedPayloadSchema = z.object({
	roleId: z.string().trim().min(1),
	assignmentId: z.string().trim().min(1),
	recipientUserId: z.string().trim().min(1),
	reactivated: z.boolean(),
});

export type IdentityOrgRoleAssignedPayload = z.infer<
	typeof identityOrgRoleAssignedPayloadSchema
>;

export const IdentityEventSchemas = {
	"identity.org_role.assigned": identityOrgRoleAssignedPayloadSchema,
} as const;

export type IdentityEventType = keyof typeof IdentityEventSchemas;
