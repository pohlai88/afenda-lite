import "server-only";

import type { Metadata } from "next";
import { cache } from "react";
import { countPendingClientAssignments } from "@/modules/declarations/domain/clients";
import type { OrgDeclarationRow } from "@/features/organization-admin/organization-admin-dashboard-types";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import { listSurveysForAdmin, type SurveyWithStats } from "@/modules/declarations/domain/surveys";
import { bootstrapOrganizationAdminTenancy } from "@/features/organization-admin/organization-admin-tenancy";

export type OrganizationAdminDashboardPageData = {
  declarationRows: OrgDeclarationRow[];
  pendingAssignments: number;
  totalResponses: number;
};

export const organizationAdminDashboardPageMetadata: Metadata = {
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

export const loadOrganizationAdminDashboardPage = cache(
  async (): Promise<OrganizationAdminDashboardPageData> => {
    const { org } = await bootstrapOrganizationAdminTenancy({
      anyOf: ["declarations.read", "declarations.manage"],
    });
    const [surveys, pendingAssignments] = await Promise.all([
      listSurveysForAdmin(org.organizationId),
      countPendingClientAssignments(org.organizationId),
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
