import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ApplicationShell05Page } from "@/components/V2/application-shell-5";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";
import {
  ApplicationShell05Placeholder,
  applicationShell05DemoHeader,
  applicationShell05DemoUser,
  buildDemoSidebarConfig,
} from "./application-shell-05.fixtures";

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
    <ApplicationShell05Page
      sidebarConfig={buildDemoSidebarConfig()}
      profileUser={applicationShell05DemoUser}
      header={applicationShell05DemoHeader}
      showStudioChrome
    >
      <ApplicationShell05Placeholder />
    </ApplicationShell05Page>
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
