import { z } from "zod";

export const platformOrganizationDeletedPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	deletedByUserId: z.string().trim().min(1),
});

export type PlatformOrganizationDeletedPayload = z.infer<
	typeof platformOrganizationDeletedPayloadSchema
>;

export const PlatformEventSchemas = {
	"platform.organization.deleted": platformOrganizationDeletedPayloadSchema,
} as const;

export type PlatformEventType = keyof typeof PlatformEventSchemas;
