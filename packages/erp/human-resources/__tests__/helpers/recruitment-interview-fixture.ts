import type { InterviewScorecardInput } from "../../src/schemas/recruitment";

export const SAMPLE_INTERVIEW_SCORECARD = {
	criteria: [
		{
			criterionCode: "communication",
			label: "Communication",
			rating: 4,
			comment: "Clear and structured answers",
		},
	],
} satisfies InterviewScorecardInput;

export const ALTERNATE_INTERVIEW_SCORECARD = {
	criteria: [
		{
			criterionCode: "problem_solving",
			label: "Problem solving",
			rating: 5,
			comment: null,
		},
	],
} satisfies InterviewScorecardInput;
