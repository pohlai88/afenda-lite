import { z } from "zod";

import { approvedPayrollHandoffSchema } from "./hr-payroll-handoff";

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
export const PLATFORM_HUMAN_RESOURCES_ACCOUNTING_PROVISIONING_FACT_RECORDED_EVENT =
	"platform.human-resources.accounting-provisioning-fact.recorded.v1" as const;
export const PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT =
	"platform.human-resources.payroll-delivery.requested.v1" as const;
export const PLATFORM_HUMAN_RESOURCES_RELIABILITY_WORK_REQUESTED_EVENT =
	"platform.human-resources.reliability-work.requested.v1" as const;

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

const integrationFactBaseSchema = z.object({
	factVersion: z.literal(1),
	eventId: z.string().trim().min(1),
	organizationId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1),
});

export const platformHumanResourcesAccountingProvisioningFactPayloadSchema =
	z.discriminatedUnion("kind", [
		integrationFactBaseSchema.extend({
			kind: z.literal("payroll_posting"),
			payrollHandoffId: z.string().trim().min(1),
			approvalEvidenceId: z.string().trim().min(1),
		}),
		integrationFactBaseSchema.extend({
			kind: z.literal("cost_centre_allocation"),
			assignmentId: z.string().trim().min(1),
			costCentreId: z.string().trim().min(1),
			allocationPercentage: z.string().trim().min(1),
		}),
		integrationFactBaseSchema.extend({
			kind: z.literal("headcount_budget"),
			workforcePlanEntityId: z.string().trim().min(1),
			action: z.enum(["approve", "reserve", "release", "consume"]),
		}),
		integrationFactBaseSchema.extend({
			kind: z.literal("access_provisioning"),
			employeeEntityId: z.string().trim().min(1),
			action: z.enum(["grant", "reconcile", "revoke"]),
		}),
		integrationFactBaseSchema.extend({
			kind: z.literal("equipment_assignment"),
			employeeEntityId: z.string().trim().min(1),
			action: z.enum(["assign", "recover"]),
		}),
	]);

export const platformHumanResourcesPayrollDeliveryRequestedPayloadSchema =
	z.object({
		deliveryId: z.string().uuid(),
		organizationId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
		attempt: z.number().int().positive(),
		payload: approvedPayrollHandoffSchema,
	});

export const platformHumanResourcesReliabilityWorkRequestedPayloadSchema =
	z.object({
		workItemId: z.string().uuid(),
		organizationId: z.string().trim().min(1),
		connector: z.string().trim().min(1).max(64),
		operation: z.string().trim().min(1).max(128),
		requestFingerprint: z.string().trim().min(1).max(128),
		attempt: z.number().int().positive(),
	});

export type PlatformHumanResourcesWorkflowFactPayload = z.infer<
	typeof platformHumanResourcesWorkflowFactPayloadSchema
>;
export type PlatformHumanResourcesReportingFactPayload = z.infer<
	typeof platformHumanResourcesReportingFactPayloadSchema
>;
export type PlatformHumanResourcesAccountingProvisioningFactPayload = z.infer<
	typeof platformHumanResourcesAccountingProvisioningFactPayloadSchema
>;
export type PlatformHumanResourcesPayrollDeliveryRequestedPayload = z.infer<
	typeof platformHumanResourcesPayrollDeliveryRequestedPayloadSchema
>;
export type PlatformHumanResourcesReliabilityWorkRequestedPayload = z.infer<
	typeof platformHumanResourcesReliabilityWorkRequestedPayloadSchema
>;

export const PlatformEventSchemas = {
	[PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT]:
		platformHumanResourcesWorkflowFactPayloadSchema,
	[PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT]:
		platformHumanResourcesReportingFactPayloadSchema,
	[PLATFORM_HUMAN_RESOURCES_ACCOUNTING_PROVISIONING_FACT_RECORDED_EVENT]:
		platformHumanResourcesAccountingProvisioningFactPayloadSchema,
	[PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT]:
		platformHumanResourcesPayrollDeliveryRequestedPayloadSchema,
	[PLATFORM_HUMAN_RESOURCES_RELIABILITY_WORK_REQUESTED_EVENT]:
		platformHumanResourcesReliabilityWorkRequestedPayloadSchema,
	"platform.organization.deleted": platformOrganizationDeletedPayloadSchema,
} as const;

export type PlatformEventType = keyof typeof PlatformEventSchemas;
