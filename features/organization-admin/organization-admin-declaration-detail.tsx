import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import OrganizationAdminDeclarationDetailView from "@/components-V2/platform-views/portal-views/organization-admin-declaration-detail";
import {
  getEvidenceRecordsByIds,
  listQuestionsForSurvey,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/modules/declarations/domain/questions";
import {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
  type OperatorDeclarationQuestionDraft,
} from "@/features/organization-admin/organization-admin-declaration-detail.logic";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import { surveyIdParamSchema } from "@/modules/declarations/schemas/surveys";
import { buildSurveyFieldsKey } from "@/modules/declarations/domain/survey-form-key";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
  type Survey,
  type SurveyResponse,
} from "@/modules/declarations/domain/surveys";
import { bootstrapOrganizationAdminTenancy } from "@/features/organization-admin/organization-admin-tenancy";

export type { OperatorDeclarationQuestionDraft } from "@/features/organization-admin/organization-admin-declaration-detail.logic";
export {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
} from "@/features/organization-admin/organization-admin-declaration-detail.logic";

export type OrganizationAdminDeclarationDetail = {
  survey: Survey;
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  /** Plain record for RSC → client boundary (Map is not serializable). */
  evidenceById: Record<string, EvidenceRecord>;
  questionDrafts: OperatorDeclarationQuestionDraft[];
  fieldsKey: string;
};

export const loadOrganizationAdminDeclarationDetail = cache(
  async (rawId: string): Promise<OrganizationAdminDeclarationDetail | null> => {
    const parsed = surveyIdParamSchema.safeParse(rawId);
    if (!parsed.success) {
      return null;
    }

    const { org } = await bootstrapOrganizationAdminTenancy({
      anyOf: ["declarations.read", "declarations.manage"],
    });
    const survey = await getSurveyForAdmin(parsed.data, org.organizationId);
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
  params: Promise<{ declarationId: string }>;
}): Promise<Metadata> {
  const { declarationId } = await params;
  const detail = await loadOrganizationAdminDeclarationDetail(declarationId);

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

/** Shared page handler for `/dashboard/[declarationId]`. */
export async function runOrganizationAdminDeclarationDetailPage({
  params,
}: {
  params: Promise<{ declarationId: string }>;
}) {
  const { declarationId } = await params;
  const detail = await loadOrganizationAdminDeclarationDetail(declarationId);

  if (!detail) {
    notFound();
  }

  return <OrganizationAdminDeclarationDetailView detail={detail} />;
}
