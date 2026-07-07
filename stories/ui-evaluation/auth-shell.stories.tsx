import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import {
  ComparisonGrid,
  CurrentAuthShell,
  LoginPage01Shell,
  LoginPage02Shell,
  ScoreAnnotation,
} from "./evaluation-primitives";

const row = getEvaluationRow("shell-auth")!;

const meta: Meta = {
  title: "UI Evaluation/Auth Shell",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const PortalAuthLayoutVsLoginPage02: Story = {
  render: () => (
    <ComparisonGrid
      left={<CurrentAuthShell />}
      right={<LoginPage02Shell />}
      annotation={
        <ScoreAnnotation
          winner="keep-current (PortalAuthLayout)"
          runnerUp="login-page-02"
          winnerScore={5}
          runnerUpScore={3.6}
          deltas={[
            { criterion: "BrandFit", winner: 5, runnerUp: 4 },
            { criterion: "PortalCompat", winner: 5, runnerUp: 3 },
            { criterion: "ImplCost", winner: 5, runnerUp: 2 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};

export const LoginPage01Reference: Story = {
  render: () => (
    <ComparisonGrid
      left={<CurrentAuthShell />}
      right={<LoginPage01Shell />}
      annotation={
        <ScoreAnnotation
          winner="keep-current"
          runnerUp="login-page-01"
          winnerScore={5}
          runnerUpScore={2.85}
          deltas={[
            { criterion: "PatternFit", winner: 5, runnerUp: 3 },
            { criterion: "BrandFit", winner: 5, runnerUp: 3 },
          ]}
          summary="Centered card loses vault hero column needed for trust notice placement."
        />
      }
    />
  ),
};
