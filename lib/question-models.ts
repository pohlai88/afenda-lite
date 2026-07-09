import type { QuestionConfig } from "@/lib/domain/survey-package";
import {
  validateQuestionAnswer,
  type QuestionAnswerValidationCopy,
} from "@/lib/question-answer-validation";

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
  copy?: QuestionAnswerValidationCopy,
): string | null {
  const defaultCopy: QuestionAnswerValidationCopy = {
    requiredFieldError: "This field is required.",
    fileRequired: "Select a PDF before continuing.",
    yesNoRequired: "Select Yes or No before continuing.",
    textTooShort: (min) => `Enter at least ${min} characters.`,
    textTooLong: (max) => `Keep your answer to ${max} characters or fewer.`,
  };

  for (const question of questions) {
    const message = validateQuestionAnswer(
      question,
      answers[question.id],
      copy ?? defaultCopy,
    );
    if (message) {
      return message;
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
