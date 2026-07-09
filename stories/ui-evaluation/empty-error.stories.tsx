import type { Meta, StoryObj } from "@storybook/react";
import { PortalRouteError } from "@/components/portal/portal-route-error";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const errorRow = getEvaluationRow("error-route")!;
const notFoundRow = getEvaluationRow("error-404")!;

function EmptyState01Mock() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-10 text-center">
      <div className="size-12 rounded-full bg-muted" />
      <h2 className="text-lg font-semibold">No data yet</h2>
      <p className="text-sm text-muted-foreground">empty-state-01 card pattern</p>
    </div>
  );
}

function ErrorPage02Mock() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="size-24 rounded-lg bg-muted" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <button type="button" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Back to home
      </button>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Empty and Error",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const PortalRouteErrorVsEmptyState01: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <PortalRouteError
          error={new Error("demo")}
          reset={() => undefined}
        />
      }
      right={<EmptyState01Mock />}
      annotation={
        <ScoreAnnotation
          winner="empty-state-01 / keep-current"
          runnerUp="error-page-02"
          winnerScore={5}
          runnerUpScore={3.35}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 3 },
            { criterion: "BrandFit", winner: 5, runnerUp: 3 },
          ]}
          summary={errorRow.winnerRationale}
        />
      }
    />
  ),
};

export const NotFoundVsErrorPage02: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold">404</h1>
          <p className="text-muted-foreground">Current not-found.tsx</p>
        </div>
      }
      right={<ErrorPage02Mock />}
      annotation={
        <ScoreAnnotation
          winner="error-page-02"
          runnerUp="keep-current"
          winnerScore={4.35}
          runnerUpScore={4.35}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
            { criterion: "A11yMobile", winner: 5, runnerUp: 4 },
          ]}
          summary={notFoundRow.winnerRationale}
        />
      }
    />
  ),
};
