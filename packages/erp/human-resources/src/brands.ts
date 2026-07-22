import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE,
	humanResourcesErrorDetails,
} from "./error-codes";

export const humanResourcesEmployeeIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeId">();
export type HumanResourcesEmployeeId = z.infer<
	typeof humanResourcesEmployeeIdSchema
>;

export const humanResourcesEmploymentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentId">();
export type HumanResourcesEmploymentId = z.infer<
	typeof humanResourcesEmploymentIdSchema
>;

export const humanResourcesEmploymentContractIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentContractId">();
export type HumanResourcesEmploymentContractId = z.infer<
	typeof humanResourcesEmploymentContractIdSchema
>;

export const humanResourcesPositionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPositionId">();
export type HumanResourcesPositionId = z.infer<
	typeof humanResourcesPositionIdSchema
>;

export const humanResourcesAssignmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesAssignmentId">();
export type HumanResourcesAssignmentId = z.infer<
	typeof humanResourcesAssignmentIdSchema
>;

export const humanResourcesDepartmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesDepartmentId">();
export type HumanResourcesDepartmentId = z.infer<
	typeof humanResourcesDepartmentIdSchema
>;

export const humanResourcesJobIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesJobId">();
export type HumanResourcesJobId = z.infer<typeof humanResourcesJobIdSchema>;

export const humanResourcesReportingLineIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesReportingLineId">();
export type HumanResourcesReportingLineId = z.infer<
	typeof humanResourcesReportingLineIdSchema
>;

export const humanResourcesRequisitionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesRequisitionId">();
export type HumanResourcesRequisitionId = z.infer<
	typeof humanResourcesRequisitionIdSchema
>;

export const humanResourcesCandidateIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCandidateId">();
export type HumanResourcesCandidateId = z.infer<
	typeof humanResourcesCandidateIdSchema
>;

export const humanResourcesApplicationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesApplicationId">();
export type HumanResourcesApplicationId = z.infer<
	typeof humanResourcesApplicationIdSchema
>;

export const humanResourcesInterviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesInterviewId">();
export type HumanResourcesInterviewId = z.infer<
	typeof humanResourcesInterviewIdSchema
>;

export const humanResourcesInterviewEvaluationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesInterviewEvaluationId">();
export type HumanResourcesInterviewEvaluationId = z.infer<
	typeof humanResourcesInterviewEvaluationIdSchema
>;

export const humanResourcesOfferIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOfferId">();
export type HumanResourcesOfferId = z.infer<typeof humanResourcesOfferIdSchema>;

export const humanResourcesOnboardingCaseIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOnboardingCaseId">();
export type HumanResourcesOnboardingCaseId = z.infer<
	typeof humanResourcesOnboardingCaseIdSchema
>;

export const humanResourcesOnboardingTaskIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOnboardingTaskId">();
export type HumanResourcesOnboardingTaskId = z.infer<
	typeof humanResourcesOnboardingTaskIdSchema
>;

export const humanResourcesProbationReviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesProbationReviewId">();
export type HumanResourcesProbationReviewId = z.infer<
	typeof humanResourcesProbationReviewIdSchema
>;

export const humanResourcesEmploymentConfirmationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentConfirmationId">();
export type HumanResourcesEmploymentConfirmationId = z.infer<
	typeof humanResourcesEmploymentConfirmationIdSchema
>;

export const humanResourcesEmploymentMovementIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmploymentMovementId">();
export type HumanResourcesEmploymentMovementId = z.infer<
	typeof humanResourcesEmploymentMovementIdSchema
>;

export const humanResourcesTerminationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesTerminationId">();
export type HumanResourcesTerminationId = z.infer<
	typeof humanResourcesTerminationIdSchema
>;

export const humanResourcesOffboardingCaseIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOffboardingCaseId">();
export type HumanResourcesOffboardingCaseId = z.infer<
	typeof humanResourcesOffboardingCaseIdSchema
>;

export const humanResourcesOffboardingTaskIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesOffboardingTaskId">();
export type HumanResourcesOffboardingTaskId = z.infer<
	typeof humanResourcesOffboardingTaskIdSchema
>;

export const humanResourcesExitInterviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesExitInterviewId">();
export type HumanResourcesExitInterviewId = z.infer<
	typeof humanResourcesExitInterviewIdSchema
>;

export const humanResourcesClearanceIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesClearanceId">();
export type HumanResourcesClearanceId = z.infer<
	typeof humanResourcesClearanceIdSchema
>;

export const humanResourcesCompensationGradeIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCompensationGradeId">();
export type HumanResourcesCompensationGradeId = z.infer<
	typeof humanResourcesCompensationGradeIdSchema
>;

export const humanResourcesSalaryBandIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesSalaryBandId">();
export type HumanResourcesSalaryBandId = z.infer<
	typeof humanResourcesSalaryBandIdSchema
>;

export const humanResourcesEmployeeCompensationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeCompensationId">();
export type HumanResourcesEmployeeCompensationId = z.infer<
	typeof humanResourcesEmployeeCompensationIdSchema
>;

export const humanResourcesCompensationReviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCompensationReviewId">();
export type HumanResourcesCompensationReviewId = z.infer<
	typeof humanResourcesCompensationReviewIdSchema
>;

export const humanResourcesBenefitPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesBenefitPlanId">();
export type HumanResourcesBenefitPlanId = z.infer<
	typeof humanResourcesBenefitPlanIdSchema
>;

export const humanResourcesBenefitEnrollmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesBenefitEnrollmentId">();
export type HumanResourcesBenefitEnrollmentId = z.infer<
	typeof humanResourcesBenefitEnrollmentIdSchema
>;

export const humanResourcesCourseIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCourseId">();
export type HumanResourcesCourseId = z.infer<
	typeof humanResourcesCourseIdSchema
>;

export const humanResourcesSessionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesSessionId">();
export type HumanResourcesSessionId = z.infer<
	typeof humanResourcesSessionIdSchema
>;

export const humanResourcesLearningAssignmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLearningAssignmentId">();
export type HumanResourcesLearningAssignmentId = z.infer<
	typeof humanResourcesLearningAssignmentIdSchema
>;

export const humanResourcesCompletionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCompletionId">();
export type HumanResourcesCompletionId = z.infer<
	typeof humanResourcesCompletionIdSchema
>;

export const humanResourcesCertificationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCertificationId">();
export type HumanResourcesCertificationId = z.infer<
	typeof humanResourcesCertificationIdSchema
>;

export const humanResourcesPerformanceCycleIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPerformanceCycleId">();
export type HumanResourcesPerformanceCycleId = z.infer<
	typeof humanResourcesPerformanceCycleIdSchema
>;

export const humanResourcesPerformanceCycleParticipantIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPerformanceCycleParticipantId">();
export type HumanResourcesPerformanceCycleParticipantId = z.infer<
	typeof humanResourcesPerformanceCycleParticipantIdSchema
>;

export const humanResourcesGoalIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesGoalId">();
export type HumanResourcesGoalId = z.infer<typeof humanResourcesGoalIdSchema>;

export const humanResourcesGoalProgressIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesGoalProgressId">();
export type HumanResourcesGoalProgressId = z.infer<
	typeof humanResourcesGoalProgressIdSchema
>;

export const humanResourcesReviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesReviewId">();
export type HumanResourcesReviewId = z.infer<
	typeof humanResourcesReviewIdSchema
>;

export const humanResourcesReviewParticipantIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesReviewParticipantId">();
export type HumanResourcesReviewParticipantId = z.infer<
	typeof humanResourcesReviewParticipantIdSchema
>;

export const humanResourcesAssessmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesAssessmentId">();
export type HumanResourcesAssessmentId = z.infer<
	typeof humanResourcesAssessmentIdSchema
>;

export const humanResourcesImprovementPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesImprovementPlanId">();
export type HumanResourcesImprovementPlanId = z.infer<
	typeof humanResourcesImprovementPlanIdSchema
>;

export const humanResourcesImprovementCheckpointIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesImprovementCheckpointId">();
export type HumanResourcesImprovementCheckpointId = z.infer<
	typeof humanResourcesImprovementCheckpointIdSchema
>;

export const humanResourcesPerformanceGoalIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPerformanceGoalId">();
export type HumanResourcesPerformanceGoalId = z.infer<
	typeof humanResourcesPerformanceGoalIdSchema
>;

export const humanResourcesPerformanceReviewIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPerformanceReviewId">();
export type HumanResourcesPerformanceReviewId = z.infer<
	typeof humanResourcesPerformanceReviewIdSchema
>;

export const humanResourcesPerformanceImprovementPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPerformanceImprovementPlanId">();
export type HumanResourcesPerformanceImprovementPlanId = z.infer<
	typeof humanResourcesPerformanceImprovementPlanIdSchema
>;

export const humanResourcesLeavePolicyIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeavePolicyId">();
export type HumanResourcesLeavePolicyId = z.infer<
	typeof humanResourcesLeavePolicyIdSchema
>;

export const humanResourcesLeaveEntitlementIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeaveEntitlementId">();
export type HumanResourcesLeaveEntitlementId = z.infer<
	typeof humanResourcesLeaveEntitlementIdSchema
>;

export const humanResourcesLeaveAdjustmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeaveAdjustmentId">();
export type HumanResourcesLeaveAdjustmentId = z.infer<
	typeof humanResourcesLeaveAdjustmentIdSchema
>;

export const humanResourcesLeaveRequestIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeaveRequestId">();
export type HumanResourcesLeaveRequestId = z.infer<
	typeof humanResourcesLeaveRequestIdSchema
>;

export const humanResourcesLeaveRequestSegmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeaveRequestSegmentId">();
export type HumanResourcesLeaveRequestSegmentId = z.infer<
	typeof humanResourcesLeaveRequestSegmentIdSchema
>;

export const humanResourcesLeaveApprovalDecisionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesLeaveApprovalDecisionId">();
export type HumanResourcesLeaveApprovalDecisionId = z.infer<
	typeof humanResourcesLeaveApprovalDecisionIdSchema
>;

export const humanResourcesHeadcountPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesHeadcountPlanId">();
export type HumanResourcesHeadcountPlanId = z.infer<
	typeof humanResourcesHeadcountPlanIdSchema
>;

export const humanResourcesHeadcountPlanLineIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesHeadcountPlanLineId">();
export type HumanResourcesHeadcountPlanLineId = z.infer<
	typeof humanResourcesHeadcountPlanLineIdSchema
>;

export const humanResourcesHeadcountReservationIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesHeadcountReservationId">();
export type HumanResourcesHeadcountReservationId = z.infer<
	typeof humanResourcesHeadcountReservationIdSchema
>;

export const humanResourcesDocumentRequirementIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesDocumentRequirementId">();
export type HumanResourcesDocumentRequirementId = z.infer<
	typeof humanResourcesDocumentRequirementIdSchema
>;

export const humanResourcesEmployeeDocumentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeDocumentId">();
export type HumanResourcesEmployeeDocumentId = z.infer<
	typeof humanResourcesEmployeeDocumentIdSchema
>;

export const humanResourcesWorkEligibilityIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesWorkEligibilityId">();
export type HumanResourcesWorkEligibilityId = z.infer<
	typeof humanResourcesWorkEligibilityIdSchema
>;

export const humanResourcesPolicyAcknowledgementIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesPolicyAcknowledgementId">();
export type HumanResourcesPolicyAcknowledgementId = z.infer<
	typeof humanResourcesPolicyAcknowledgementIdSchema
>;

/** Brand after UUID generation or trusted DB load — never cast without parse. */
export function parseHumanResourcesEmployeeId(
	id: string,
): Result<HumanResourcesEmployeeId> {
	const parsed = humanResourcesEmployeeIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentId(
	id: string,
): Result<HumanResourcesEmploymentId> {
	const parsed = humanResourcesEmploymentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentContractId(
	id: string,
): Result<HumanResourcesEmploymentContractId> {
	const parsed = humanResourcesEmploymentContractIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment contract identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPositionId(
	id: string,
): Result<HumanResourcesPositionId> {
	const parsed = humanResourcesPositionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid position identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesAssignmentId(
	id: string,
): Result<HumanResourcesAssignmentId> {
	const parsed = humanResourcesAssignmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid assignment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesDepartmentId(
	id: string,
): Result<HumanResourcesDepartmentId> {
	const parsed = humanResourcesDepartmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid department identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesJobId(
	id: string,
): Result<HumanResourcesJobId> {
	const parsed = humanResourcesJobIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid job identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesReportingLineId(
	id: string,
): Result<HumanResourcesReportingLineId> {
	const parsed = humanResourcesReportingLineIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid reporting line identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesRequisitionId(
	id: string,
): Result<HumanResourcesRequisitionId> {
	const parsed = humanResourcesRequisitionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid requisition identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCandidateId(
	id: string,
): Result<HumanResourcesCandidateId> {
	const parsed = humanResourcesCandidateIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid candidate identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesApplicationId(
	id: string,
): Result<HumanResourcesApplicationId> {
	const parsed = humanResourcesApplicationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid application identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesInterviewId(
	id: string,
): Result<HumanResourcesInterviewId> {
	const parsed = humanResourcesInterviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesInterviewEvaluationId(
	id: string,
): Result<HumanResourcesInterviewEvaluationId> {
	const parsed = humanResourcesInterviewEvaluationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview evaluation identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOfferId(
	id: string,
): Result<HumanResourcesOfferId> {
	const parsed = humanResourcesOfferIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid offer identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOnboardingCaseId(
	id: string,
): Result<HumanResourcesOnboardingCaseId> {
	const parsed = humanResourcesOnboardingCaseIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid onboarding case identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOnboardingTaskId(
	id: string,
): Result<HumanResourcesOnboardingTaskId> {
	const parsed = humanResourcesOnboardingTaskIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid onboarding task identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesProbationReviewId(
	id: string,
): Result<HumanResourcesProbationReviewId> {
	const parsed = humanResourcesProbationReviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid probation review identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentConfirmationId(
	id: string,
): Result<HumanResourcesEmploymentConfirmationId> {
	const parsed = humanResourcesEmploymentConfirmationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment confirmation identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmploymentMovementId(
	id: string,
): Result<HumanResourcesEmploymentMovementId> {
	const parsed = humanResourcesEmploymentMovementIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment movement identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesTerminationId(
	id: string,
): Result<HumanResourcesTerminationId> {
	const parsed = humanResourcesTerminationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid termination identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOffboardingCaseId(
	id: string,
): Result<HumanResourcesOffboardingCaseId> {
	const parsed = humanResourcesOffboardingCaseIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid offboarding case identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesOffboardingTaskId(
	id: string,
): Result<HumanResourcesOffboardingTaskId> {
	const parsed = humanResourcesOffboardingTaskIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid offboarding task identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesExitInterviewId(
	id: string,
): Result<HumanResourcesExitInterviewId> {
	const parsed = humanResourcesExitInterviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid exit interview identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesClearanceId(
	id: string,
): Result<HumanResourcesClearanceId> {
	const parsed = humanResourcesClearanceIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid clearance identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCompensationGradeId(
	id: string,
): Result<HumanResourcesCompensationGradeId> {
	const parsed = humanResourcesCompensationGradeIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid compensation grade identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesSalaryBandId(
	id: string,
): Result<HumanResourcesSalaryBandId> {
	const parsed = humanResourcesSalaryBandIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid salary band identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmployeeCompensationId(
	id: string,
): Result<HumanResourcesEmployeeCompensationId> {
	const parsed = humanResourcesEmployeeCompensationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee compensation identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCompensationReviewId(
	id: string,
): Result<HumanResourcesCompensationReviewId> {
	const parsed = humanResourcesCompensationReviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid compensation review identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesBenefitPlanId(
	id: string,
): Result<HumanResourcesBenefitPlanId> {
	const parsed = humanResourcesBenefitPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid benefit plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesBenefitEnrollmentId(
	id: string,
): Result<HumanResourcesBenefitEnrollmentId> {
	const parsed = humanResourcesBenefitEnrollmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid benefit enrollment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCourseId(
	id: string,
): Result<HumanResourcesCourseId> {
	const parsed = humanResourcesCourseIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid course identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesSessionId(
	id: string,
): Result<HumanResourcesSessionId> {
	const parsed = humanResourcesSessionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid session identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLearningAssignmentId(
	id: string,
): Result<HumanResourcesLearningAssignmentId> {
	const parsed = humanResourcesLearningAssignmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid learning assignment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCompletionId(
	id: string,
): Result<HumanResourcesCompletionId> {
	const parsed = humanResourcesCompletionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid completion identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCertificationId(
	id: string,
): Result<HumanResourcesCertificationId> {
	const parsed = humanResourcesCertificationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid certification identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeavePolicyId(
	id: string,
): Result<HumanResourcesLeavePolicyId> {
	const parsed = humanResourcesLeavePolicyIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave policy identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeaveEntitlementId(
	id: string,
): Result<HumanResourcesLeaveEntitlementId> {
	const parsed = humanResourcesLeaveEntitlementIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave entitlement identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeaveAdjustmentId(
	id: string,
): Result<HumanResourcesLeaveAdjustmentId> {
	const parsed = humanResourcesLeaveAdjustmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave adjustment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeaveRequestId(
	id: string,
): Result<HumanResourcesLeaveRequestId> {
	const parsed = humanResourcesLeaveRequestIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave request identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeaveRequestSegmentId(
	id: string,
): Result<HumanResourcesLeaveRequestSegmentId> {
	const parsed = humanResourcesLeaveRequestSegmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave request segment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesLeaveApprovalDecisionId(
	id: string,
): Result<HumanResourcesLeaveApprovalDecisionId> {
	const parsed = humanResourcesLeaveApprovalDecisionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid leave approval decision identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPerformanceCycleId(
	id: string,
): Result<HumanResourcesPerformanceCycleId> {
	const parsed = humanResourcesPerformanceCycleIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance cycle identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesGoalId(
	id: string,
): Result<HumanResourcesGoalId> {
	const parsed = humanResourcesGoalIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance goal identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesReviewId(
	id: string,
): Result<HumanResourcesReviewId> {
	const parsed = humanResourcesReviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance review identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPerformanceCycleParticipantId(
	id: string,
): Result<HumanResourcesPerformanceCycleParticipantId> {
	const parsed =
		humanResourcesPerformanceCycleParticipantIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance cycle participant identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesReviewParticipantId(
	id: string,
): Result<HumanResourcesReviewParticipantId> {
	const parsed = humanResourcesReviewParticipantIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance review participant identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesAssessmentId(
	id: string,
): Result<HumanResourcesAssessmentId> {
	const parsed = humanResourcesAssessmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance assessment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesGoalProgressId(
	id: string,
): Result<HumanResourcesGoalProgressId> {
	const parsed = humanResourcesGoalProgressIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid goal progress identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesImprovementCheckpointId(
	id: string,
): Result<HumanResourcesImprovementCheckpointId> {
	const parsed = humanResourcesImprovementCheckpointIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid improvement checkpoint identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesImprovementPlanId(
	id: string,
): Result<HumanResourcesImprovementPlanId> {
	const parsed = humanResourcesImprovementPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid improvement plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPerformanceGoalId(
	id: string,
): Result<HumanResourcesPerformanceGoalId> {
	const parsed = humanResourcesPerformanceGoalIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance goal identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPerformanceReviewId(
	id: string,
): Result<HumanResourcesPerformanceReviewId> {
	const parsed = humanResourcesPerformanceReviewIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid performance review identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPerformanceImprovementPlanId(
	id: string,
): Result<HumanResourcesPerformanceImprovementPlanId> {
	const parsed = humanResourcesPerformanceImprovementPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid improvement plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export const humanResourcesEmployeeCaseIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeCaseId">();
export type HumanResourcesEmployeeCaseId = z.infer<
	typeof humanResourcesEmployeeCaseIdSchema
>;

export const humanResourcesEmployeeCaseEventIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeCaseEventId">();
export type HumanResourcesEmployeeCaseEventId = z.infer<
	typeof humanResourcesEmployeeCaseEventIdSchema
>;

export const humanResourcesEmployeeCaseActionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeCaseActionId">();
export type HumanResourcesEmployeeCaseActionId = z.infer<
	typeof humanResourcesEmployeeCaseActionIdSchema
>;

export const humanResourcesEmployeeCaseAppealIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeCaseAppealId">();
export type HumanResourcesEmployeeCaseAppealId = z.infer<
	typeof humanResourcesEmployeeCaseAppealIdSchema
>;

export function parseHumanResourcesEmployeeCaseId(
	id: string,
): Result<HumanResourcesEmployeeCaseId> {
	const parsed = humanResourcesEmployeeCaseIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee case identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmployeeCaseEventId(
	id: string,
): Result<HumanResourcesEmployeeCaseEventId> {
	const parsed = humanResourcesEmployeeCaseEventIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee case event identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmployeeCaseActionId(
	id: string,
): Result<HumanResourcesEmployeeCaseActionId> {
	const parsed = humanResourcesEmployeeCaseActionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee case action identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmployeeCaseAppealId(
	id: string,
): Result<HumanResourcesEmployeeCaseAppealId> {
	const parsed = humanResourcesEmployeeCaseAppealIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee case appeal identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesHeadcountPlanId(
	id: string,
): Result<HumanResourcesHeadcountPlanId> {
	const parsed = humanResourcesHeadcountPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid headcount plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesHeadcountPlanLineId(
	id: string,
): Result<HumanResourcesHeadcountPlanLineId> {
	const parsed = humanResourcesHeadcountPlanLineIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid headcount plan line identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesHeadcountReservationId(
	id: string,
): Result<HumanResourcesHeadcountReservationId> {
	const parsed = humanResourcesHeadcountReservationIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid headcount reservation identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesDocumentRequirementId(
	id: string,
): Result<HumanResourcesDocumentRequirementId> {
	const parsed = humanResourcesDocumentRequirementIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid document requirement identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesEmployeeDocumentId(
	id: string,
): Result<HumanResourcesEmployeeDocumentId> {
	const parsed = humanResourcesEmployeeDocumentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employee document identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesWorkEligibilityId(
	id: string,
): Result<HumanResourcesWorkEligibilityId> {
	const parsed = humanResourcesWorkEligibilityIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid work eligibility identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesPolicyAcknowledgementId(
	id: string,
): Result<HumanResourcesPolicyAcknowledgementId> {
	const parsed = humanResourcesPolicyAcknowledgementIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid policy acknowledgement identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export const humanResourcesCompetencyIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCompetencyId">();
export type HumanResourcesCompetencyId = z.infer<
	typeof humanResourcesCompetencyIdSchema
>;

export const humanResourcesJobCompetencyIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesJobCompetencyId">();
export type HumanResourcesJobCompetencyId = z.infer<
	typeof humanResourcesJobCompetencyIdSchema
>;

export const humanResourcesCompetencyAssessmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCompetencyAssessmentId">();
export type HumanResourcesCompetencyAssessmentId = z.infer<
	typeof humanResourcesCompetencyAssessmentIdSchema
>;

export const humanResourcesTalentProfileIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesTalentProfileId">();
export type HumanResourcesTalentProfileId = z.infer<
	typeof humanResourcesTalentProfileIdSchema
>;

export const humanResourcesTalentProfileAssessmentIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesTalentProfileAssessmentId">();
export type HumanResourcesTalentProfileAssessmentId = z.infer<
	typeof humanResourcesTalentProfileAssessmentIdSchema
>;

export const humanResourcesTalentPoolIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesTalentPoolId">();
export type HumanResourcesTalentPoolId = z.infer<
	typeof humanResourcesTalentPoolIdSchema
>;

export const humanResourcesTalentPoolMemberIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesTalentPoolMemberId">();
export type HumanResourcesTalentPoolMemberId = z.infer<
	typeof humanResourcesTalentPoolMemberIdSchema
>;

export const humanResourcesCareerPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCareerPlanId">();
export type HumanResourcesCareerPlanId = z.infer<
	typeof humanResourcesCareerPlanIdSchema
>;

export const humanResourcesCareerPlanActionIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesCareerPlanActionId">();
export type HumanResourcesCareerPlanActionId = z.infer<
	typeof humanResourcesCareerPlanActionIdSchema
>;

export const humanResourcesSuccessionPlanIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesSuccessionPlanId">();
export type HumanResourcesSuccessionPlanId = z.infer<
	typeof humanResourcesSuccessionPlanIdSchema
>;

export const humanResourcesSuccessionCandidateIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesSuccessionCandidateId">();
export type HumanResourcesSuccessionCandidateId = z.infer<
	typeof humanResourcesSuccessionCandidateIdSchema
>;

export function parseHumanResourcesCompetencyId(
	id: string,
): Result<HumanResourcesCompetencyId> {
	const parsed = humanResourcesCompetencyIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid competency identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesJobCompetencyId(
	id: string,
): Result<HumanResourcesJobCompetencyId> {
	const parsed = humanResourcesJobCompetencyIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid job competency identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCompetencyAssessmentId(
	id: string,
): Result<HumanResourcesCompetencyAssessmentId> {
	const parsed = humanResourcesCompetencyAssessmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid competency assessment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesTalentProfileId(
	id: string,
): Result<HumanResourcesTalentProfileId> {
	const parsed = humanResourcesTalentProfileIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid talent profile identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesTalentProfileAssessmentId(
	id: string,
): Result<HumanResourcesTalentProfileAssessmentId> {
	const parsed = humanResourcesTalentProfileAssessmentIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid talent profile assessment identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesTalentPoolId(
	id: string,
): Result<HumanResourcesTalentPoolId> {
	const parsed = humanResourcesTalentPoolIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid talent pool identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesTalentPoolMemberId(
	id: string,
): Result<HumanResourcesTalentPoolMemberId> {
	const parsed = humanResourcesTalentPoolMemberIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid talent pool member identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCareerPlanId(
	id: string,
): Result<HumanResourcesCareerPlanId> {
	const parsed = humanResourcesCareerPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid career plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesCareerPlanActionId(
	id: string,
): Result<HumanResourcesCareerPlanActionId> {
	const parsed = humanResourcesCareerPlanActionIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid career plan action identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesSuccessionPlanId(
	id: string,
): Result<HumanResourcesSuccessionPlanId> {
	const parsed = humanResourcesSuccessionPlanIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid succession plan identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseHumanResourcesSuccessionCandidateId(
	id: string,
): Result<HumanResourcesSuccessionCandidateId> {
	const parsed = humanResourcesSuccessionCandidateIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid succession candidate identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}
