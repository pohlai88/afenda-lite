"use client";

import { DeclarationForm } from "@/components/declaration-form";
import {
  saveClientDeclarationDraftAction,
  submitClientDeclarationAction,
} from "@/app/actions/client";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/question-models";

export function ClientDeclarationForm({
  assignmentId,
  surveyId,
  slug,
  title,
  description,
  questions,
  initialAnswers,
  initialStepIndex,
  initialEvidenceNames,
}: {
  assignmentId: string;
  surveyId: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  initialAnswers?: SurveyAnswers;
  initialStepIndex?: number;
  initialEvidenceNames?: Record<string, string>;
}) {
  return (
    <DeclarationForm
      surveyId={surveyId}
      slug={slug}
      title={title}
      description={description}
      questions={questions}
      assignmentId={assignmentId}
      hideCardTitle
      initialAnswers={initialAnswers}
      initialStepIndex={initialStepIndex}
      initialEvidenceNames={initialEvidenceNames}
      onSaveDraft={async ({ assignmentId, answers, stepIndex }) =>
        saveClientDeclarationDraftAction({ assignmentId, answers, stepIndex })
      }
      onSubmit={async ({ slug, assignmentId, answers }) => {
        if (!assignmentId) return { error: "Assignment not found." };
        return submitClientDeclarationAction({ assignmentId, slug, answers });
      }}
    />
  );
}
