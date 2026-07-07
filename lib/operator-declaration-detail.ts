import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import {
  getEvidenceRecordsByIds,
  listQuestionsForSurvey,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/lib/questions";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { surveyIdParamSchema } from "@/lib/schemas/surveys";
import { buildSurveyFieldsKey } from "@/lib/survey-form-key";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
  type Survey,
  type SurveyResponse,
} from "@/lib/surveys";

export type OperatorDeclarationQuestionDraft = {
  prompt: string;
  type: SurveyQuestion["type"];
  required: boolean;
  config?: SurveyQuestion["config"];
};

export type OperatorDeclarationDetail = {
  survey: Survey;
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  evidenceById: Map<string, EvidenceRecord>;
  questionDrafts: OperatorDeclarationQuestionDraft[];
  fieldsKey: string;
};

function collectEvidenceIds(
  responses: SurveyResponse[],
  questions: SurveyQuestion[],
) {
  const evidenceIds = new Set<string>();

  for (const response of responses) {
    if (!response.answers) continue;

    for (const question of questions) {
      if (question.type !== "file") continue;

      const value = response.answers[question.id];
      if (typeof value === "string" && value) {
        evidenceIds.add(value);
      }
    }
  }

  return evidenceIds;
}

export const loadOperatorDeclarationDetail = cache(
  async (rawId: string): Promise<OperatorDeclarationDetail | null> => {
    const parsed = surveyIdParamSchema.safeParse(rawId);
    if (!parsed.success) {
      return null;
    }

    const survey = await getSurveyForAdmin(parsed.data);
    if (!survey) {
      return null;
    }

    const [responses, questions] = await Promise.all([
      listResponsesForSurvey(survey.id),
      listQuestionsForSurvey(survey.id),
    ]);

    const evidenceById = await getEvidenceRecordsByIds(
      [...collectEvidenceIds(responses, questions)],
      survey.id,
    );

    const questionDrafts = questions.map((question) => ({
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      config: question.config,
    }));

    const fieldsKey = buildSurveyFieldsKey({
      title: survey.title,
      description: survey.question,
      metadata: survey,
      questions: questionDrafts,
    });

    return {
      survey,
      responses,
      questions,
      evidenceById,
      questionDrafts,
      fieldsKey,
    };
  },
);

export async function operatorDeclarationDetailMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadOperatorDeclarationDetail(id);

  if (!detail) {
    return {
      title: `${PORTAL_NAME} — ${portalCopy.metadata.dashboard.title}`,
      description: portalCopy.metadata.dashboard.description,
    };
  }

  return {
    title: `${PORTAL_NAME} — ${detail.survey.title}`,
    description: detail.survey.question,
  };
}
