import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { productionSeedFixtures } from "@/lib/production-fixtures";
import {
  ComparisonGrid,
  MockKpiCards,
  ScoreAnnotation,
} from "./evaluation-primitives";

const row = getEvaluationRow("client-dashboard")!;
const { metrics, previewClient, declaration } = productionSeedFixtures;

const meta: Meta = {
  title: "UI Evaluation/Client Dashboard",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const CurrentVsStatistics03: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Seed: {previewClient.displayName} · pending {metrics.pending} (
            {declaration.title})
          </p>
          <MockKpiCards variant="current" />
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
