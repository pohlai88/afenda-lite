import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import type { OrgDeclarationRow } from "@/components/org-declarations-table";
import { countPendingClientAssignments } from "@/lib/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export type OperatorDashboardPageData = {
  declarationRows: OrgDeclarationRow[];
  pendingAssignments: number;
  totalResponses: number;
};

export const operatorDashboardPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.dashboard.title}`,
  description: portalCopy.metadata.dashboard.description,
};

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
      declarationRows: surveys.map((survey) => ({
        id: survey.id,
        title: survey.title,
        description: survey.question,
        caseNumber: survey.caseNumber,
        responseCount: survey.responseCount,
      })),
    };
  },
);
