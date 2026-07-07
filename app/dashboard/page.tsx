import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/app/actions/admin";
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";
import { DeclarationCreateButton } from "@/components/declaration-create-button";
import { DashboardPage, PortalSection } from "@/components/dashboard-page";
import { OrgCreateDeclarationLink } from "@/components/org-create-declaration-link";
import {
  OrgDeclarationsTable,
  type OrgDeclarationRow,
} from "@/components/org-declarations-table";
import { PortalEmptyStateCta } from "@/components/portal-empty-state-cta";
import { PortalStatisticsCard } from "@/components/portal-statistics-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countPendingClientAssignments } from "@/lib/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.dashboard.title}`,
  description: portalCopy.metadata.dashboard.description,
};

export default async function DashboardPageRoute() {
  const { org, nav } = portalCopy;
  await requireAdminSession();
  const [surveys, pendingAssignments] = await Promise.all([
    listSurveysForAdmin(),
    countPendingClientAssignments(),
  ]);
  const totalResponses = surveys.reduce(
    (sum, survey) => sum + survey.responseCount,
    0,
  );
  const declarationRows: OrgDeclarationRow[] = surveys.map((survey) => ({
    id: survey.id,
    title: survey.title,
    description: survey.question,
    caseNumber: survey.caseNumber,
    responseCount: survey.responseCount,
  }));

  return (
    <DashboardPage
      eyebrow={org.eyebrow}
      title={org.title}
      description={org.description}
      breadcrumbs={[{ label: nav.declarations }]}
      actions={
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/clients" />}
          nativeButton={false}
        >
          {org.list.inviteClients}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatisticsCard
          icon={<ClipboardListIcon className="size-4" />}
          value={surveys.length}
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

      <div className="grid gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <Card id="create-declaration" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>{org.create.title}</CardTitle>
            <CardDescription>{org.create.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeclarationCreateButton />
          </CardContent>
        </Card>

        <PortalSection
          title={org.list.title}
          description={org.list.description}
        >
          {surveys.length === 0 ? (
            <PortalEmptyStateCta
              sectionTitle={org.list.title}
              sectionDescription={org.list.description}
              icon={FileTextIcon}
              title={org.list.emptyTitle}
              description={org.list.emptyDescription}
              action={
                <OrgCreateDeclarationLink label={org.list.emptyAction} />
              }
            />
          ) : (
            <OrgDeclarationsTable rows={declarationRows} />
          )}
        </PortalSection>
      </div>
    </DashboardPage>
  );
}
