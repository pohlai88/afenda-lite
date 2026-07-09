import type { Meta, StoryObj } from "@storybook/react";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const row = getEvaluationRow("client-onboarding")!;

function MultiStepForm01Mock() {
  const steps = ["Profile", "Address", "Review"];
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-6 flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`rounded-full px-3 py-1 text-xs ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {i + 1}. {s}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Stepper navigation — multi-step-form-01 pattern
      </p>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Client Onboarding",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const PortalFormSectionVsMultiStep01: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <PortalFormSection
          title="Complete your profile"
          description="Single-page onboarding form."
        >
          <p className="text-sm text-muted-foreground">Form fields…</p>
        </PortalFormSection>
      }
      right={<MultiStepForm01Mock />}
      annotation={
        <ScoreAnnotation
          winner="multi-step-form-01"
          runnerUp="keep-current (PortalFormSection)"
          winnerScore={4.25}
          runnerUpScore={4.15}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 3 },
            { criterion: "ImplCost", winner: 3, runnerUp: 5 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
