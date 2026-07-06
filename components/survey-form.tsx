"use client";

import { DeclarationForm } from "@/components/declaration-form";
import { submitSurveyResponseAction } from "@/app/actions/surveys";
import type { SurveyQuestion } from "@/lib/questions";

export function SurveyForm({
  surveyId,
  slug,
  title,
  description,
  questions,
  anonymous = false,
}: {
  surveyId: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  anonymous?: boolean;
}) {
  return (
    <DeclarationForm
      surveyId={surveyId}
      slug={slug}
      title={title}
      description={description}
      questions={questions}
      anonymous={anonymous}
      onSubmit={async ({ slug, answers }) =>
        submitSurveyResponseAction({ slug, answers })
      }
    />
  );
}
