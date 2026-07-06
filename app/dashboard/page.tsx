import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/app/actions/admin";
import {
  BarChart3Icon,
  ClipboardListIcon,
  UsersIcon,
} from "lucide-react";
import { DeclarationCreateForm } from "@/components/declaration-create-form";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { PortalSection, PortalShell } from "@/components/portal-shell";
import { PortalStatCard } from "@/components/portal-stat-card";
import { Badge } from "@/components/ui/badge";
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

export default async function DashboardPage() {
  const { org } = portalCopy;
  await requireAdminSession();
  const [surveys, pendingAssignments] = await Promise.all([
    listSurveysForAdmin(),
    countPendingClientAssignments(),
  ]);
  const totalResponses = surveys.reduce(
    (sum, survey) => sum + survey.responseCount,
    0,
  );

  return (
    <PortalShell
      eyebrow={org.eyebrow}
      title={org.title}
      description={org.description}
      headerActions={
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
        <PortalStatCard
          icon={<ClipboardListIcon className="size-4" />}
          value={String(surveys.length)}
          title={org.stats.declarations.title}
          detail={org.stats.declarations.detail}
        />
        <PortalStatCard
          icon={<BarChart3Icon className="size-4" />}
          value={String(totalResponses)}
          title={org.stats.submissions.title}
          detail={org.stats.submissions.detail}
        />
        <PortalStatCard
          icon={<UsersIcon className="size-4" />}
          value={String(pendingAssignments)}
          title={org.stats.pendingAssignments.title}
          detail={org.stats.pendingAssignments.detail}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{org.create.title}</CardTitle>
            <CardDescription>{org.create.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeclarationCreateForm />
          </CardContent>
        </Card>

        <PortalSection
          title={org.list.title}
          description={org.list.description}
        >
          {surveys.length === 0 ? (
            <PortalEmptyState>{org.list.empty}</PortalEmptyState>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <Card key={survey.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="truncate">{survey.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {survey.question}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {org.list.submissions(survey.responseCount)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/dashboard/${survey.id}`} />}
                      nativeButton={false}
                    >
                      {org.list.viewSubmissions}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/dashboard/${survey.id}#share`} />}
                      nativeButton={false}
                    >
                      {org.list.shareAccess}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}
