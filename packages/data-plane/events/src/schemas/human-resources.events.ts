import { z } from "zod";

const humanResourcesEntityPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.string().trim().min(1),
	entityId: z.string().trim().min(1),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
});

export const humanResourcesEntityPayloadSchema =
	humanResourcesEntityPayloadBase;

export type HumanResourcesEntityPayload = z.infer<
	typeof humanResourcesEntityPayloadSchema
>;

export const HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT =
	"human-resources.employee.created.v1" as const;
export const HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT =
	"human-resources.employment.started.v1" as const;
export const HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT =
	"human-resources.employment.changed.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT =
	"human-resources.employee.transferred.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT =
	"human-resources.employee.terminated.v1" as const;
export const HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT =
	"human-resources.requisition.approved.v1" as const;
export const HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT =
	"human-resources.offer.accepted.v1" as const;
export const HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT =
	"human-resources.onboarding.started.v1" as const;
export const HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT =
	"human-resources.onboarding.completed.v1" as const;
export const HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT =
	"human-resources.offboarding.started.v1" as const;
export const HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT =
	"human-resources.offboarding.completed.v1" as const;
export const HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT =
	"human-resources.compensation.changed.v1" as const;
export const HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT =
	"human-resources.benefit-enrollment.changed.v1" as const;
export const HUMAN_RESOURCES_LEAVE_APPROVED_EVENT =
	"human-resources.leave.approved.v1" as const;
export const HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT =
	"human-resources.timesheet.approved.v1" as const;
export const HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT =
	"human-resources.certification.expiring.v1" as const;

export const HumanResourcesEventSchemas = {
	[HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEAVE_APPROVED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT]:
		humanResourcesEntityPayloadSchema,
} as const;

export type HumanResourcesEventType = keyof typeof HumanResourcesEventSchemas;

export const HUMAN_RESOURCES_EVENT_IDS = [
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
] as const satisfies readonly HumanResourcesEventType[];
