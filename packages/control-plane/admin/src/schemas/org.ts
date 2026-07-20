import { z } from "zod";

export const organizationSummarySchema = z.object({
	id: z.string().min(1),
	slug: z.string().min(1),
	name: z.string().min(1).optional(),
	/** Latest `platform_rbac_audit.created_at` for this org; null when none. */
	lastActivityAt: z
		.union([z.string().datetime(), z.date()])
		.nullable()
		.optional(),
});

export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

export const deleteOrganizationInputSchema = z.object({
	orgId: z.string().trim().min(1),
});

export type DeleteOrganizationInput = z.infer<
	typeof deleteOrganizationInputSchema
>;

export const deletedOrganizationSchema = z.object({
	orgId: z.string().min(1),
});

export type DeletedOrganization = z.infer<typeof deletedOrganizationSchema>;

export const createOrganizationInputSchema = z.object({
	name: z.string().trim().min(1),
	slug: z
		.string()
		.trim()
		.min(1)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
});

export type CreateOrganizationInput = z.infer<
	typeof createOrganizationInputSchema
>;

export const createdOrganizationSchema = z.object({
	id: z.string().min(1),
	slug: z.string().min(1),
	name: z.string().min(1),
});

export type CreatedOrganization = z.infer<typeof createdOrganizationSchema>;

/** Partial-failure disposition when create succeeded but a later step failed. */
export const PROVISION_ORG_CREATED_SET_ACTIVE_FAILED =
	"org_created_set_active_failed" as const;
export const PROVISION_ORG_CREATED_INVITE_FAILED =
	"org_created_invite_failed" as const;

export const provisionOrganizationInputSchema = z.object({
	name: z.string().trim().min(1),
	slug: z
		.string()
		.trim()
		.min(1)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
	adminEmail: z
		.string()
		.trim()
		.email()
		.transform((value) => value.toLowerCase()),
	adminRole: z.enum(["admin", "operator", "client"]),
});

export type ProvisionOrganizationInput = z.infer<
	typeof provisionOrganizationInputSchema
>;

export const provisionOrganizationResultSchema = z.object({
	organization: createdOrganizationSchema,
	invitationId: z.string().min(1).nullable(),
});

export type ProvisionOrganizationResult = z.infer<
	typeof provisionOrganizationResultSchema
>;
