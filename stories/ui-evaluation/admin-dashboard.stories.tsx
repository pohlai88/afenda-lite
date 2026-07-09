import type { Meta, StoryObj } from "@storybook/react";
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { StudioDataTable } from "@/components/shadcn-studio/blocks/datatable-transaction";
import { PortalEyebrow } from "@/components/portal/portal-eyebrow";
import { PortalStatisticsCard } from "@/components/portal/portal-statistics-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import type { OrgDeclarationRow } from "@/lib/pages/operator-dashboard-types";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";
import { previewDeclarationRows } from "./evaluation-fixtures";

const dashboardRow = getEvaluationRow("admin-dashboard")!;

/** Storybook-safe table preview — avoids server actions from OrgDeclarationsTable. */
function AdminDeclarationsTablePreview({
  rows,
  title,
  description,
}: {
  rows: OrgDeclarationRow[];
  title?: string;
  description?: string;
}) {
  const columns = useMemo<ColumnDef<OrgDeclarationRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Declaration",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[280px]">
            <span className="block truncate font-medium">{row.original.title}</span>
            {row.original.description ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.original.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "caseNumber",
        header: "Case",
        cell: ({ row }) => (
          <span className="block max-w-[120px] truncate text-sm text-muted-foreground tabular-nums">
            {row.original.caseNumber ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "responseCount",
        header: "Submissions",
        cell: ({ row }) => (
          <Badge variant="surface" className="tabular-nums">
            {row.original.responseCount} submissions
          </Badge>
        ),
      },
    ],
    [],
  );

  const pageSize = 8;

  return (
    <Card className="min-w-0 overflow-hidden py-0">
      {title || description ? (
        <CardHeader className="border-b py-4">
          {title ? <h2 className="portal-card-title">{title}</h2> : null}
          {description ? (
            <CardDescription className="text-pretty">{description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <StudioDataTable
        data={rows}
        columns={columns}
        pageSize={pageSize}
      />
    </Card>
  );
}

function BadgeContrastPanel() {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="portal-card-title">Badge contrast on card</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">secondary (legacy)</Badge>
        <Badge variant="surface">surface (counts)</Badge>
        <Badge variant="success">success (accepted)</Badge>
        <Badge variant="outline">outline (pending)</Badge>
      </CardContent>
    </Card>
  );
}

function AdminDashboardPreview() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <PortalEyebrow>Organization</PortalEyebrow>
        <h1 className="portal-page-title">Declaration management</h1>
        <p className="portal-page-description">
          Create declarations, invite clients, share access links, and review
          submissions.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatisticsCard
          icon={<ClipboardListIcon className="size-4" />}
          value={13}
          title="Declarations"
          description="Active forms available to share."
        />
        <PortalStatisticsCard
          icon={<BarChart3Icon className="size-4" />}
          value={0}
          title="Submissions"
          description="Declarations completed via your links."
        />
        <PortalStatisticsCard
          icon={<UsersIcon className="size-4" />}
          value={1}
          title="Pending assignments"
          description="Client declarations awaiting completion."
        />
      </div>

      <AdminDeclarationsTablePreview
        rows={previewDeclarationRows}
        title="Declarations"
        description="Open a declaration for settings, JSON import, sharing, and submissions."
      />

      <BadgeContrastPanel />
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Admin Dashboard",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const RevisedOperatorDashboard: Story = {
  render: () => <AdminDashboardPreview />,
};

export const DeclarationsTableWithIntegratedHeader: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl p-6">
      <AdminDeclarationsTablePreview
        rows={previewDeclarationRows}
        title="Declarations"
        description="Open a declaration for settings, JSON import, sharing, and submissions."
      />
    </div>
  ),
};

export const BadgeContrastBeforeAfter: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <Card>
          <CardHeader>
            <CardTitle className="portal-card-title">Before — secondary on card</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">0 submissions</Badge>
            <Badge variant="secondary">accepted</Badge>
          </CardContent>
        </Card>
      }
      right={
        <Card>
          <CardHeader>
            <CardTitle className="portal-card-title">After — surface / success</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="surface">0 submissions</Badge>
            <Badge variant="success">accepted</Badge>
          </CardContent>
        </Card>
      }
      annotation={
        <ScoreAnnotation
          winner="datatable-component-01"
          runnerUp="keep-current"
          winnerScore={4.55}
          runnerUpScore={4.35}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
            { criterion: "Consistency", winner: 5, runnerUp: 4 },
          ]}
          summary={dashboardRow.winnerRationale}
        />
      }
    />
  ),
};

export const EmptyStateWithCardHeader: Story = {
  render: () => (
    <div className="mx-auto max-w-md p-6">
      <Card className="min-w-0">
        <CardHeader>
          <h2 className="portal-card-title">Declarations</h2>
        </CardHeader>
        <CardContent>
          <div className="portal-empty-state-panel">
            <FileTextIcon
              aria-hidden="true"
              className="mx-auto size-12 text-muted-foreground"
            />
            <p className="mt-3 text-sm font-medium">No declarations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first declaration to start inviting clients.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};
