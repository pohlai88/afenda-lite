import { z } from "zod";

import {
	USAGE_BANDS,
	USAGE_METRIC_KEYS,
	type UsageBand,
	type UsageMetricKey,
} from "../usage-bands";

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

export const usageBandSchema = z.enum(USAGE_BANDS);

export const usageMetricKeySchema = z.enum(USAGE_METRIC_KEYS);

export const usageMetricCellSchema = z.object({
	current: z.number().int().min(0),
	band: usageBandSchema,
});

export type UsageMetricCell = z.infer<typeof usageMetricCellSchema>;

export const usageAlertLevelSchema = z.enum(["warning", "critical"]);

export type UsageAlertLevel = z.infer<typeof usageAlertLevelSchema>;

export const usageAlertSchema = z.object({
	metric: usageMetricKeySchema,
	level: usageAlertLevelSchema,
});

export type UsageAlert = z.infer<typeof usageAlertSchema>;

/** Living metric cells — keys locked to `USAGE_METRIC_KEYS` (no placeholders). */
const organizationUsageMetricsCellsSchema = z.object({
	activeMembers: usageMetricCellSchema,
	rbacAuditEvents: usageMetricCellSchema,
	activeRoleAssignments: usageMetricCellSchema,
} satisfies Record<UsageMetricKey, typeof usageMetricCellSchema>);

/**
 * Org-console usage position for a calendar month — living counters + ops bands.
 * No storage / API-call / ERP invoice placeholders. No SKU limits / percentages.
 */
export const organizationUsageMetricsSchema = z.object({
	orgId: z.string().min(1),
	period: usagePeriodSchema,
	metrics: organizationUsageMetricsCellsSchema,
	alerts: z.array(usageAlertSchema),
});

export type OrganizationUsageMetrics = z.infer<
	typeof organizationUsageMetricsSchema
>;

export type { UsageBand, UsageMetricKey };
