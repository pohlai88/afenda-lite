import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import OperatorDeclarationDetailView from "@/components-V2/platform-views/portal-views/operator-declaration-detail";
import {
  getEvidenceRecordsByIds,
  listQuestionsForSurvey,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/lib/domain/questions";
import {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
  type OperatorDeclarationQuestionDraft,
} from "@/lib/pages/operator-declaration-detail.logic";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { surveyIdParamSchema } from "@/lib/schemas/surveys";
import { buildSurveyFieldsKey } from "@/lib/domain/survey-form-key";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
  type Survey,
  type SurveyResponse,
} from "@/lib/domain/surveys";

export type { OperatorDeclarationQuestionDraft } from "@/lib/pages/operator-declaration-detail.logic";
export {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
} from "@/lib/pages/operator-declaration-detail.logic";

export type OperatorDeclarationDetail = {
  survey: Survey;
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  /** Plain record for RSC → client boundary (Map is not serializable). */
  evidenceById: Record<string, EvidenceRecord>;
  questionDrafts: OperatorDeclarationQuestionDraft[];
  fieldsKey: string;
};

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

    const evidenceMap = await getEvidenceRecordsByIds(
      collectSubmissionFileEvidenceIds(responses, questions),
      survey.id,
    );

    const questionDrafts = mapOperatorDeclarationQuestionDrafts(questions);
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
      evidenceById: Object.fromEntries(evidenceMap),
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

/** Shared page handler for `/dashboard/[id]`. */
export async function runOperatorDeclarationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadOperatorDeclarationDetail(id);

  if (!detail) {
    notFound();
  }

  return <OperatorDeclarationDetailView detail={detail} />;
}
