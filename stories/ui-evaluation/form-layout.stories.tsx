import type { Meta, StoryObj } from "@storybook/react";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const row = getEvaluationRow("client-profile")!;

function FormLayout01Reference() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <h2 className="text-lg font-semibold">Section title</h2>
        <p className="text-sm text-muted-foreground">Description</p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="h-10 rounded border bg-muted/30" />
        <div className="h-10 rounded border bg-muted/30" />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Form Layout",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const PortalFormSectionAdoption: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <PortalFormSection
          title="Declarant profile"
          description="form-layout-01 pattern already adopted."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded border bg-muted/20" />
            <div className="h-10 rounded border bg-muted/20" />
          </div>
        </PortalFormSection>
      }
      right={<FormLayout01Reference />}
      annotation={
        <ScoreAnnotation
          winner="form-layout-01"
          runnerUp="keep-current"
          winnerScore={5}
          runnerUpScore={4.55}
          deltas={[
            { criterion: "Consistency", winner: 5, runnerUp: 5 },
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
