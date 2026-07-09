import type { Meta, StoryObj } from "@storybook/react";
import { ClientDashboardSummary } from "@/components/client/client-dashboard-summary";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import {
  ComparisonGrid,
  MockKpiCards,
  ScoreAnnotation,
} from "./evaluation-primitives";
import {
  syncedPreviewClientDeclarant,
  syncedPreviewClientMetrics,
  syncedProductionFixtureLabel,
} from "./synced-production-fixtures";

const row = getEvaluationRow("client-dashboard")!;

const meta: Meta = {
  title: "UI Evaluation/Client Dashboard",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const SyncedProductionFixture: Story = {
  render: () => (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Production seed: {syncedProductionFixtureLabel()}
      </p>
      <ClientDashboardSummary
        declarant={syncedPreviewClientDeclarant()}
        metrics={syncedPreviewClientMetrics()}
      />
    </div>
  ),
};

export const CurrentVsStatistics03: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Production seed: {syncedProductionFixtureLabel()}
          </p>
          <ClientDashboardSummary
            declarant={syncedPreviewClientDeclarant()}
            metrics={syncedPreviewClientMetrics()}
          />
        </div>
      }
      right={<MockKpiCards variant="stats03" />}
      annotation={
        <ScoreAnnotation
          winner="statistics-component-03"
          runnerUp="keep-current"
          winnerScore={4.45}
          runnerUpScore={4.15}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 3 },
            { criterion: "Consistency", winner: 5, runnerUp: 3 },
            { criterion: "ImplCost", winner: 4, runnerUp: 5 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
