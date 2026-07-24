import { z } from "zod";

export const platformOrganizationDeletedPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	deletedByUserId: z.string().trim().min(1),
});

export type PlatformOrganizationDeletedPayload = z.infer<
	typeof platformOrganizationDeletedPayloadSchema
>;

export const PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT =
	"platform.human-resources.workflow-fact.recorded.v1" as const;
export const PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT =
	"platform.human-resources.reporting-fact.recorded.v1" as const;

export const platformHumanResourcesWorkflowFactPayloadSchema = z.object({
	eventId: z.string().trim().min(1),
	organizationId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	aggregateType: z.string().trim().min(1),
	aggregateId: z.string().trim().min(1),
	workflow: z.enum(["onboarding", "offboarding"]),
	transition: z.enum(["started", "completed"]),
	outcome: z.enum(["in_progress", "completed"]),
	policySnapshot: z.object({
		operation: z.string().trim().min(1).nullable(),
		idempotencyKey: z.string().trim().min(1).nullable(),
	}),
});

export const platformHumanResourcesReportingFactPayloadSchema = z.object({
	factVersion: z.literal(1),
	eventId: z.string().trim().min(1),
	eventType: z.string().trim().min(1),
	organizationId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	entityType: z.string().trim().min(1),
	entityId: z.string().trim().min(1),
	occurredAt: z.string().datetime(),
	requiredPermission: z.literal("human-resources.employee.read"),
});

export type PlatformHumanResourcesWorkflowFactPayload = z.infer<
	typeof platformHumanResourcesWorkflowFactPayloadSchema
>;
export type PlatformHumanResourcesReportingFactPayload = z.infer<
	typeof platformHumanResourcesReportingFactPayloadSchema
>;

export const PlatformEventSchemas = {
	[PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT]:
		platformHumanResourcesWorkflowFactPayloadSchema,
	[PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT]:
		platformHumanResourcesReportingFactPayloadSchema,
	"platform.organization.deleted": platformOrganizationDeletedPayloadSchema,
} as const;

export type PlatformEventType = keyof typeof PlatformEventSchemas;
