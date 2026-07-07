import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { productionSeedFixtures } from "@/lib/production-fixtures";
import {
  ComparisonGrid,
  MockDataTable,
  ScoreAnnotation,
} from "./evaluation-primitives";

const clientsRow = getEvaluationRow("admin-clients")!;

const meta: Meta = {
  title: "UI Evaluation/Admin Datatable",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const OrgClientTablesVsDatatable04: Story = {
  render: () => (
    <ComparisonGrid
      left={<MockDataTable variant="current" />}
      right={<MockDataTable variant="studio" />}
      annotation={
        <ScoreAnnotation
          winner="datatable-component-04"
          runnerUp="keep-current"
          winnerScore={4.65}
          runnerUpScore={4.35}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
            { criterion: "A11yMobile", winner: 5, runnerUp: 4 },
          ]}
          summary={clientsRow.winnerRationale}
        />
      }
    />
  ),
};

export const DeclarationsVsDatatable01: Story = {
  render: () => {
    const row = getEvaluationRow("admin-dashboard")!;
    return (
      <ComparisonGrid
        left={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Seed: {productionSeedFixtures.declaration.title}
            </p>
            <MockDataTable variant="current" />
          </div>
        }
        right={<MockDataTable variant="studio" />}
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
            summary={row.winnerRationale}
          />
        }
      />
    );
  },
};
