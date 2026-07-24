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

export const IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT =
	"identity.human-resources.lifecycle-fact.recorded.v1" as const;

export const identityHumanResourcesLifecycleFactPayloadSchema = z.object({
	eventId: z.string().trim().min(1),
	organizationId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	employeeEntityId: z.string().trim().min(1),
	lifecycle: z.enum(["joiner", "mover", "leaver"]),
	effectiveFactVersion: z.literal(1),
});

export type IdentityHumanResourcesLifecycleFactPayload = z.infer<
	typeof identityHumanResourcesLifecycleFactPayloadSchema
>;

export const IdentityEventSchemas = {
	[IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT]:
		identityHumanResourcesLifecycleFactPayloadSchema,
	"identity.org_role.assigned": identityOrgRoleAssignedPayloadSchema,
} as const;

export type IdentityEventType = keyof typeof IdentityEventSchemas;
