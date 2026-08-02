import type { InterviewEvaluation } from "../../kernel/contracts";

export const INTERVIEW_EVALUATION_PUBLIC_FIELDS = [
	"id",
	"organizationId",
	"interviewId",
	"result",
	"scorecard",
	"evaluatorActorId",
	"recordedAt",
	"version",
	"createdBy",
	"updatedBy",
	"createdAt",
	"updatedAt",
] as const satisfies ReadonlyArray<keyof InterviewEvaluation>;

export const INTERVIEW_EVALUATION_CONFIDENTIAL_FIELDS = [
	"privateNotes",
] as const satisfies ReadonlyArray<keyof InterviewEvaluation>;

export function projectInterviewEvaluationForReader(
	evaluation: InterviewEvaluation,
	canReadConfidential: boolean,
): InterviewEvaluation {
	if (canReadConfidential) {
		return evaluation;
	}
	return {
		...evaluation,
		privateNotes: null,
	};
}

export function interviewEvaluationQueryRequestedFields(): readonly string[] {
	return [
		...INTERVIEW_EVALUATION_PUBLIC_FIELDS,
		...INTERVIEW_EVALUATION_CONFIDENTIAL_FIELDS,
	];
}
