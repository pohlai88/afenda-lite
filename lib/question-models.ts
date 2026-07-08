import type { QuestionConfig } from "@/lib/survey-package";

export type QuestionType = "yes_no" | "text" | "file";

export type SurveyQuestion = {
  id: string;
  surveyId: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  sortOrder: number;
  config: QuestionConfig;
};

export type SurveyAnswers = Record<string, boolean | string>;

export type EvidenceRecord = {
  id: string;
  surveyId: string;
  questionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export function validateAnswers(
  questions: SurveyQuestion[],
  answers: SurveyAnswers,
) {
  for (const question of questions) {
    const value = answers[question.id];
    if (!question.required) continue;

    if (question.type === "yes_no") {
      if (typeof value !== "boolean") {
        return question.prompt;
      }
      continue;
    }

    if (typeof value !== "string" || !value.trim()) {
      return question.prompt;
    }
  }
  return null;
}

export function formatAnswerForDisplay(
  question: SurveyQuestion,
  value: boolean | string | undefined,
  evidenceName?: string,
) {
  if (value === undefined) return "—";
  if (question.type === "yes_no") return value ? "Yes" : "No";
  if (question.type === "file") return evidenceName ?? String(value);
  return String(value);
}
