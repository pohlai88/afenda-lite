import Link from "next/link";
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";
import { DeclarationCreateButton } from "@/components/declaration-create-button";
import { DashboardPage } from "@/components/dashboard-page";
import { OrgCreateDeclarationLink } from "@/components/operator/org-create-declaration-link";
import { OrgDeclarationsTable } from "@/components/operator/org-declarations-table";
import { PortalEmptyStateCta } from "@/components/portal/portal-empty-state-cta";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import { PortalStatisticsCard } from "@/components/portal/portal-statistics-card";
import { Button } from "@/components/ui/button";
import { operatorDashboardBreadcrumbs } from "@/lib/operator-breadcrumbs";
import type { OperatorDashboardPageData } from "@/lib/pages/operator-dashboard-page";
import { OPERATOR_CLIENTS_HREF } from "@/lib/routing/portal-routes";
import { portalCopy } from "@/lib/copy/portal-copy";

export function OperatorDashboardPageView({
  data,
}: {
  data: OperatorDashboardPageData;
}) {
  const { org } = portalCopy;
  const { declarationRows, pendingAssignments, totalResponses } = data;

  return (
    <DashboardPage
      eyebrow={org.eyebrow}
      title={org.title}
      description={org.description}
      breadcrumbs={operatorDashboardBreadcrumbs()}
      actions={
        <Button
          variant="outline"
          size="sm"
          render={<Link href={OPERATOR_CLIENTS_HREF} />}
          nativeButton={false}
        >
          {org.list.inviteClients}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatisticsCard
          icon={<ClipboardListIcon className="size-4" />}
          value={declarationRows.length}
          title={org.stats.declarations.title}
          description={org.stats.declarations.detail}
        />
        <PortalStatisticsCard
          icon={<BarChart3Icon className="size-4" />}
          value={totalResponses}
          title={org.stats.submissions.title}
          description={org.stats.submissions.detail}
        />
        <PortalStatisticsCard
          icon={<UsersIcon className="size-4" />}
          value={pendingAssignments}
          title={org.stats.pendingAssignments.title}
          description={org.stats.pendingAssignments.detail}
        />
      </div>

      <div className="grid gap-8 portal-grid-split">
        <PortalFormSection
          id="create-declaration"
          className="scroll-mt-20"
          title={org.create.title}
          description={org.create.description}
        >
          <DeclarationCreateButton />
        </PortalFormSection>

        {declarationRows.length === 0 ? (
          <PortalEmptyStateCta
            sectionTitle={org.list.title}
            sectionDescription={org.list.description}
            icon={FileTextIcon}
            title={org.list.emptyTitle}
            description={org.list.emptyDescription}
            action={<OrgCreateDeclarationLink label={org.list.emptyAction} />}
          />
        ) : (
          <OrgDeclarationsTable
            rows={declarationRows}
            title={org.list.title}
            description={org.list.description}
          />
        )}
      </div>
    </DashboardPage>
  );
}
