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
