import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const row = getEvaluationRow("shell-dashboard")!;

function CurrentDashboardShell() {
  return (
    <div className="flex min-h-[400px] rounded-lg border">
      <aside className="w-48 border-r bg-muted/30 p-4 text-sm">
        Sidebar nav
      </aside>
      <main className="flex-1 p-4">Dashboard content</main>
    </div>
  );
}

function DashboardShell05Mock() {
  return (
    <div className="flex min-h-[400px] rounded-lg border">
      <aside className="w-56 border-r bg-card p-4 text-sm">
        <p className="font-medium">dashboard-shell-05</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Breadcrumb header · collapsible sidebar
        </p>
      </aside>
      <main className="flex-1 space-y-3 p-4">
        <div className="text-xs text-muted-foreground">Breadcrumb / header</div>
        <div className="rounded border p-4">Tabbed detail region</div>
      </main>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Admin Shell",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const CurrentVsDashboardShell05: Story = {
  render: () => (
    <ComparisonGrid
      left={<CurrentDashboardShell />}
      right={<DashboardShell05Mock />}
      annotation={
        <ScoreAnnotation
          winner="dashboard-shell-05"
          runnerUp="keep-current"
          winnerScore={4.25}
          runnerUpScore={4.35}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
            { criterion: "Consistency", winner: 5, runnerUp: 4 },
            { criterion: "ImplCost", winner: 3, runnerUp: 5 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
