import type { QuestionType, SurveyQuestion } from "@/lib/question-models";
import type { SurveyAnswers } from "@/lib/question-models";
import {
  validateQuestionAnswer,
  type QuestionAnswerValidationCopy,
} from "@/lib/question-answer-validation";

export type DeclarationWizardStep = {
  id: string;
  title: string;
  description: string;
  kind: "questions" | "review";
  questions: SurveyQuestion[];
  questionType?: QuestionType;
};

const MAX_QUESTIONS_PER_STEP = 4;

function stepMeta(
  type: QuestionType,
  copy: {
    stepAttestationsTitle: string;
    stepAttestationsDescription: string;
    stepTextTitle: string;
    stepTextDescription: string;
    stepFileTitle: string;
    stepFileDescription: string;
  },
  partIndex: number,
): Pick<DeclarationWizardStep, "title" | "description"> {
  const suffix = partIndex > 0 ? ` (${partIndex + 1})` : "";

  switch (type) {
    case "yes_no":
      return {
        title: `${copy.stepAttestationsTitle}${suffix}`,
        description: copy.stepAttestationsDescription,
      };
    case "text":
      return {
        title: `${copy.stepTextTitle}${suffix}`,
        description: copy.stepTextDescription,
      };
    case "file":
      return {
        title: `${copy.stepFileTitle}${suffix}`,
        description: copy.stepFileDescription,
      };
  }
}

export function buildDeclarationWizardSteps(
  questions: SurveyQuestion[],
  copy: {
    stepAttestationsTitle: string;
    stepAttestationsDescription: string;
    stepTextTitle: string;
    stepTextDescription: string;
    stepFileTitle: string;
    stepFileDescription: string;
    stepReviewTitle: string;
    stepReviewDescription: string;
  },
): DeclarationWizardStep[] {
  const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
  const steps: DeclarationWizardStep[] = [];
  const typePartCount: Partial<Record<QuestionType, number>> = {};

  let buffer: SurveyQuestion[] = [];
  let bufferType: QuestionType | null = null;

  function flushBuffer() {
    if (!buffer.length || !bufferType) return;
    const partIndex = typePartCount[bufferType] ?? 0;
    typePartCount[bufferType] = partIndex + 1;
    const meta = stepMeta(bufferType, copy, partIndex);
    steps.push({
      id: `step-${bufferType}-${partIndex}`,
      ...meta,
      kind: "questions",
      questions: buffer,
      questionType: bufferType,
    });
    buffer = [];
    bufferType = null;
  }

  for (const question of sorted) {
    const typeChanged = bufferType !== null && question.type !== bufferType;
    const bufferFull = buffer.length >= MAX_QUESTIONS_PER_STEP;

    if (typeChanged || bufferFull) {
      flushBuffer();
    }

    buffer.push(question);
    bufferType = question.type;
  }

  flushBuffer();

  steps.push({
    id: "step-review",
    title: copy.stepReviewTitle,
    description: copy.stepReviewDescription,
    kind: "review",
    questions: [],
  });

  return steps;
}

/** Skip per-question review summary above this count (large declarations). */
export const REVIEW_SUMMARY_QUESTION_LIMIT = 50;

export function clampDraftStepIndex(stepIndex: number, stepCount: number) {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(0, stepIndex), stepCount - 1);
}

export function countAnsweredQuestions(
  questions: SurveyQuestion[],
  answers: Record<string, boolean | string | undefined>,
) {
  return questions.filter((question) => {
    const value = answers[question.id];
    return value !== undefined && value !== "";
  }).length;
}

export function buildEvidenceNamesFromDraft(
  questions: SurveyQuestion[],
  answers: SurveyAnswers,
  evidenceById: ReadonlyMap<string, { fileName: string }>,
) {
  const names: Record<string, string> = {};
  for (const question of questions) {
    if (question.type !== "file") continue;
    const value = answers[question.id];
    if (typeof value !== "string" || !value) continue;
    names[question.id] = evidenceById.get(value)?.fileName ?? value;
  }
  return names;
}

export function validateStepAnswers(
  step: DeclarationWizardStep,
  answers: Record<string, boolean | string | undefined>,
  copy: QuestionAnswerValidationCopy,
): Record<string, string> {
  if (step.kind === "review") {
    return {};
  }

  const errors: Record<string, string> = {};
  for (const question of step.questions) {
    const message = validateQuestionAnswer(question, answers[question.id], copy);
    if (message) {
      errors[question.id] = message;
    }
  }
  return errors;
}
