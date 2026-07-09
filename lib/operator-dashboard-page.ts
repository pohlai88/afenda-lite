import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import { countPendingClientAssignments } from "@/lib/clients";
import type { OrgDeclarationRow } from "@/lib/operator-dashboard-types";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin, type SurveyWithStats } from "@/lib/surveys";

export type OperatorDashboardPageData = {
  declarationRows: OrgDeclarationRow[];
  pendingAssignments: number;
  totalResponses: number;
};

export const operatorDashboardPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.dashboard.title}`,
  description: portalCopy.metadata.dashboard.description,
};

function toDeclarationRows(surveys: SurveyWithStats[]): OrgDeclarationRow[] {
  return surveys.map((survey) => ({
    id: survey.id,
    title: survey.title,
    description: survey.question,
    caseNumber: survey.caseNumber,
    responseCount: survey.responseCount,
  }));
}

/** @internal Exported for unit tests — maps admin surveys to datatable rows. */
export const mapOperatorDeclarationRows = toDeclarationRows;

export const loadOperatorDashboardPage = cache(
  async (): Promise<OperatorDashboardPageData> => {
    const [surveys, pendingAssignments] = await Promise.all([
      listSurveysForAdmin(),
      countPendingClientAssignments(),
    ]);

    const totalResponses = surveys.reduce(
      (sum, survey) => sum + survey.responseCount,
      0,
    );

    return {
      pendingAssignments,
      totalResponses,
      declarationRows: toDeclarationRows(surveys),
    };
  },
);
