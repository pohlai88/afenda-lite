"use client";

import { DeclarationForm } from "@/components/declaration-form";
import { submitClientDeclarationAction } from "@/app/actions/client";
import type { SurveyQuestion } from "@/lib/questions";

export function ClientDeclarationForm({
  assignmentId,
  surveyId,
  slug,
  title,
  description,
  questions,
}: {
  assignmentId: string;
  surveyId: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
}) {
  return (
    <DeclarationForm
      surveyId={surveyId}
      slug={slug}
      title={title}
      description={description}
      questions={questions}
      assignmentId={assignmentId}
      onSubmit={async ({ slug, assignmentId, answers }) => {
        if (!assignmentId) return { error: "Assignment not found." };
        return submitClientDeclarationAction({ assignmentId, slug, answers });
      }}
    />
  );
}
