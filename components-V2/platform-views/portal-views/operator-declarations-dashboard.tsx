import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components-V2/platform-components/ui/avatar";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { PortalCreateDeclarationButton } from "@/components-V2/platform-views/portal-views/portal-create-declaration-button";
import { PortalDeclarationsTable } from "@/components-V2/platform-views/portal-views/portal-declarations-table";
import { cn } from "@/components-V2/lib/utils";
import type { OperatorDashboardPageData } from "@/lib/pages/operator-dashboard-page";
import { OPERATOR_CLIENTS_HREF } from "@/lib/routing/portal-routes";
import { portalCopy } from "@/lib/copy/portal-copy";

function KpiCard({
  icon,
  title,
  description,
  value,
  iconClassName,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  value: number;
  iconClassName?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </div>
        <Avatar size="lg" className="rounded-sm after:border-0">
          <AvatarFallback
            className={cn(
              "bg-primary/10 text-primary shrink-0 rounded-sm [&>svg]:size-5",
              iconClassName,
            )}
          >
            {icon}
          </AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function OperatorDeclarationsDashboard({
  data,
}: {
  data: OperatorDashboardPageData;
}) {
  const { org } = portalCopy;
  const { declarationRows, pendingAssignments, totalResponses } = data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {org.eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {org.title}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-pretty text-sm">
            {org.description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={OPERATOR_CLIENTS_HREF} />}
          nativeButton={false}
        >
          {org.list.inviteClients}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<ClipboardListIcon />}
          value={declarationRows.length}
          title={org.stats.declarations.title}
          description={org.stats.declarations.detail}
          iconClassName="bg-chart-1/10 text-chart-1"
        />
        <KpiCard
          icon={<BarChart3Icon />}
          value={totalResponses}
          title={org.stats.submissions.title}
          description={org.stats.submissions.detail}
          iconClassName="bg-chart-2/10 text-chart-2"
        />
        <KpiCard
          icon={<UsersIcon />}
          value={pendingAssignments}
          title={org.stats.pendingAssignments.title}
          description={org.stats.pendingAssignments.detail}
          iconClassName="bg-chart-5/10 text-chart-5"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{org.create.title}</CardTitle>
            <CardDescription className="text-pretty">
              {org.create.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalCreateDeclarationButton />
          </CardContent>
        </Card>

        {declarationRows.length === 0 ? (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{org.list.title}</CardTitle>
              <CardDescription className="text-pretty">
                {org.list.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                <FileTextIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{org.list.emptyTitle}</p>
                <p className="text-muted-foreground text-sm text-pretty">
                  {org.list.emptyDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PortalDeclarationsTable
            rows={declarationRows}
            title={org.list.title}
            description={org.list.description}
          />
        )}
      </div>
    </div>
  );
}
