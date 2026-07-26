import type {
	PerformanceAssessment,
	PerformanceAssessmentProjection,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewParticipant,
} from "../types";

export const PERFORMANCE_REVIEW_PUBLIC_FIELDS = [
	"id",
	"organizationId",
	"cycleId",
	"employeeId",
	"employmentId",
	"status",
	"version",
	"createdBy",
	"updatedBy",
	"createdAt",
	"updatedAt",
] as const satisfies ReadonlyArray<keyof PerformanceReview>;

export const PERFORMANCE_REVIEW_CONFIDENTIAL_FIELDS = [
	"overallRating",
	"acknowledgementNote",
	"calibrationNote",
] as const satisfies ReadonlyArray<keyof PerformanceReview>;

export const PERFORMANCE_ASSESSMENT_CONFIDENTIAL_FIELDS = [
	"rating",
	"commentsSensitive",
] as const satisfies ReadonlyArray<keyof PerformanceAssessmentProjection>;

export function projectPerformanceAssessmentForReader(
	assessment: PerformanceAssessment,
	canReadConfidential: boolean,
): PerformanceAssessmentProjection {
	const base: PerformanceAssessmentProjection = {
		id: assessment.id,
		participantId: assessment.participantId,
		kind: assessment.kind,
		rating: assessment.rating,
		commentsSensitive: assessment.commentsSensitive,
		submittedAt: assessment.submittedAt,
		version: assessment.version,
	};
	if (canReadConfidential) {
		return base;
	}
	return {
		...base,
		rating: null,
		commentsSensitive: null,
	};
}

export function projectPerformanceReviewForReader(
	review: PerformanceReview,
	canReadConfidential: boolean,
): PerformanceReview {
	if (canReadConfidential) {
		return review;
	}
	return {
		...review,
		overallRating: null,
		acknowledgementNote: null,
		calibrationNote: null,
	};
}

export function projectPerformanceReviewDetailForReader(
	input: {
		review: PerformanceReview;
		participants: PerformanceReviewParticipant[];
		assessments: PerformanceAssessment[];
	},
	canReadConfidential: boolean,
): PerformanceReviewDetail {
	return {
		review: projectPerformanceReviewForReader(
			input.review,
			canReadConfidential,
		),
		participants: input.participants,
		assessments: input.assessments.map((assessment) =>
			projectPerformanceAssessmentForReader(assessment, canReadConfidential),
		),
	};
}

export function performanceReviewQueryRequestedFields(): readonly string[] {
	return [
		...PERFORMANCE_REVIEW_PUBLIC_FIELDS,
		...PERFORMANCE_REVIEW_CONFIDENTIAL_FIELDS,
		"rating",
		"commentsSensitive",
	];
}
