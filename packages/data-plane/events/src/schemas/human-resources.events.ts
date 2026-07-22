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
export const HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT =
	"human-resources.leave.requested.v1" as const;
export const HUMAN_RESOURCES_LEAVE_REJECTED_EVENT =
	"human-resources.leave.rejected.v1" as const;
export const HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT =
	"human-resources.leave.cancelled.v1" as const;
export const HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT =
	"human-resources.leave.entitlement-adjusted.v1" as const;
export const HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT =
	"human-resources.timesheet.approved.v1" as const;
export const HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT =
	"human-resources.certification.expiring.v1" as const;
export const HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT =
	"human-resources.learning-assignment.created.v1" as const;
export const HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT =
	"human-resources.learning-completion.recorded.v1" as const;
export const HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT =
	"human-resources.performance-cycle.opened.v1" as const;
export const HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT =
	"human-resources.performance-goal.approved.v1" as const;
export const HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT =
	"human-resources.performance-review.finalized.v1" as const;
export const HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT =
	"human-resources.performance-review.reopened.v1" as const;
export const HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT =
	"human-resources.improvement-plan.started.v1" as const;
export const HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT =
	"human-resources.improvement-plan.completed.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT =
	"human-resources.employee-document.registered.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT =
	"human-resources.employee-document.verified.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT =
	"human-resources.employee-document.nearing-expiry.v1" as const;
export const HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT =
	"human-resources.work-eligibility.suspended.v1" as const;
export const HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT =
	"human-resources.policy-acknowledgement.outstanding.v1" as const;
export const HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT =
	"human-resources.policy-acknowledgement.acknowledged.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT =
	"human-resources.employee-case.opened.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT =
	"human-resources.employee-case.interim-measure-issued.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT =
	"human-resources.employee-case.finding-recorded.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT =
	"human-resources.employee-case.action-approved.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT =
	"human-resources.employee-case.appeal-resolved.v1" as const;
export const HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT =
	"human-resources.employee-case.closed.v1" as const;
export const HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT =
	"human-resources.competency.assessed.v1" as const;
export const HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT =
	"human-resources.talent-pool.membership-approved.v1" as const;
export const HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT =
	"human-resources.career-plan.acknowledged.v1" as const;
export const HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT =
	"human-resources.succession-candidate.approved.v1" as const;
export const HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT =
	"human-resources.succession.readiness-changed.v1" as const;

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
	[HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEAVE_REJECTED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT]: humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT]:
		humanResourcesEntityPayloadSchema,
	[HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT]:
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
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_REGISTERED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_VERIFIED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_NEARING_EXPIRY_EVENT,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_SUSPENDED_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_OUTSTANDING_EVENT,
	HUMAN_RESOURCES_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_OPENED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_INTERIM_MEASURE_ISSUED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_FINDING_RECORDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_ACTION_APPROVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_APPEAL_RESOLVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CASE_CLOSED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
] as const satisfies readonly HumanResourcesEventType[];
