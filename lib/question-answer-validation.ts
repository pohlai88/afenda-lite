import { SURVEY_TEXT_ANSWER_MAX } from "@/lib/form-constraints";
import type { SurveyQuestion } from "@/lib/question-models";

export type QuestionAnswerValidationCopy = {
  requiredFieldError: string;
  fileRequired: string;
  yesNoRequired: string;
  textTooShort: (min: number) => string;
  textTooLong: (max: number) => string;
};

export function textAnswerMaxLength(question: SurveyQuestion): number {
  return question.config.maxLength ?? SURVEY_TEXT_ANSWER_MAX;
}

export function textAnswerMinLength(question: SurveyQuestion): number | undefined {
  const min = question.config.minLength;
  return min && min > 0 ? min : undefined;
}

export function textAnswerRequirementsHint(question: SurveyQuestion): string | null {
  const min = textAnswerMinLength(question);
  const max = textAnswerMaxLength(question);
  if (min && max < SURVEY_TEXT_ANSWER_MAX) {
    return `${min.toLocaleString()}–${max.toLocaleString()} characters.`;
  }
  if (min) {
    return `At least ${min.toLocaleString()} characters.`;
  }
  if (question.config.maxLength) {
    return `Up to ${max.toLocaleString()} characters.`;
  }
  return `Up to ${SURVEY_TEXT_ANSWER_MAX.toLocaleString()} characters.`;
}

export function validateQuestionAnswer(
  question: SurveyQuestion,
  value: boolean | string | undefined,
  copy: QuestionAnswerValidationCopy,
): string | null {
  if (question.type === "yes_no") {
    if (question.required && typeof value !== "boolean") {
      return copy.yesNoRequired;
    }
    return null;
  }

  if (question.type === "file") {
    if (question.required && (typeof value !== "string" || !value.trim())) {
      return copy.fileRequired;
    }
    return null;
  }

  const text = typeof value === "string" ? value.trim() : "";
  if (question.required && !text) {
    return copy.requiredFieldError;
  }
  if (!text) {
    return null;
  }

  const min = textAnswerMinLength(question);
  const max = textAnswerMaxLength(question);
  if (min && text.length < min) {
    return copy.textTooShort(min);
  }
  if (text.length > max) {
    return copy.textTooLong(max);
  }

  return null;
}
