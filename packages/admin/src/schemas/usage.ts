import { z } from "zod";

/** Calendar month key `YYYY-MM` (UTC bounds). */
export const usagePeriodSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be YYYY-MM");

export type UsagePeriod = z.infer<typeof usagePeriodSchema>;

export const getOrganizationUsageInputSchema = z.object({
	orgId: z.string().trim().min(1),
	period: usagePeriodSchema,
});

export type GetOrganizationUsageInput = z.infer<
	typeof getOrganizationUsageInputSchema
>;

/**
 * Org-console usage for a calendar month — only fields backed by live counts.
 * No storage / API-call / ERP invoice placeholders.
 */
export const organizationUsageMetricsSchema = z.object({
	orgId: z.string().min(1),
	period: usagePeriodSchema,
	activeMembers: z.number().int().min(0),
	rbacAuditEvents: z.number().int().min(0),
	activeRoleAssignments: z.number().int().min(0),
});

export type OrganizationUsageMetrics = z.infer<
	typeof organizationUsageMetricsSchema
>;
