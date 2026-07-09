import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/governance/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const row = getEvaluationRow("account-settings")!;

function NeonAccountMock() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">Account settings</h2>
      <p className="text-sm text-muted-foreground">
        Neon AccountView — email, name, session-backed updates.
      </p>
      <label className="block text-sm">
        Display name
        <input className="mt-1 w-full rounded-md border px-3 py-2" readOnly />
      </label>
    </div>
  );
}

function AccountSettings01Mock() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-card p-6">
      <section className="space-y-2 border-b pb-4">
        <h3 className="font-medium">Personal info</h3>
        <p className="text-xs text-muted-foreground">Image upload · country flag</p>
      </section>
      <section className="space-y-2 border-b pb-4">
        <h3 className="font-medium">Email & password</h3>
      </section>
      <section className="space-y-2">
        <h3 className="font-medium text-destructive">Danger zone</h3>
      </section>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Account Settings",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const AccountViewVsAccountSettings01: Story = {
  render: () => (
    <ComparisonGrid
      left={<NeonAccountMock />}
      right={<AccountSettings01Mock />}
      annotation={
        <ScoreAnnotation
          winner="keep-current (Neon AccountView)"
          runnerUp="account-settings-01"
          winnerScore={4.8}
          runnerUpScore={3.75}
          deltas={[
            { criterion: "PortalCompat", winner: 5, runnerUp: 3 },
            { criterion: "ImplCost", winner: 5, runnerUp: 3 },
            { criterion: "PatternFit", winner: 5, runnerUp: 4 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
