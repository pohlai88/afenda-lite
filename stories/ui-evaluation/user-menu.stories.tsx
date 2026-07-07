import type { Meta, StoryObj } from "@storybook/react";
import { PortalMemberMenu } from "@/components/portal-member-menu";
import { PortalMemberProvider } from "@/components/portal-member-context";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { productionSeedFixtures } from "@/lib/production-fixtures";
import { portalCopy } from "@/lib/portal-copy";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const row = getEvaluationRow("user-menu")!;
const { previewClient } = productionSeedFixtures;

const syncedMember = {
  userId: "00000000-0000-0000-0000-000000000001",
  email: previewClient.email,
  authName: previewClient.displayName,
  displayName: previewClient.displayName,
  subtitle: previewClient.entityName,
  role: previewClient.role,
  context: "client" as const,
  isPreviewSession: false,
  profile: {
    fullLegalName: previewClient.displayName,
    entityName: previewClient.entityName,
    onboardingComplete: true,
  },
};

const meta: Meta = {
  title: "UI Evaluation/User Menu",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const SyncedProductionFixture: Story = {
  render: () => (
    <PortalMemberProvider member={syncedMember}>
      <div className="flex min-w-[20rem] flex-col gap-4 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Production seed: {previewClient.email} · {previewClient.entityName}
        </p>
        <PortalMemberMenu />
      </div>
    </PortalMemberProvider>
  ),
};

export const CurrentVsDashboardDropdown: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <PortalMemberProvider member={syncedMember}>
          <div className="rounded-lg border bg-card p-6">
            <p className="mb-4 text-sm font-medium">{portalCopy.clientNav.declarantProfile}</p>
            <PortalMemberMenu />
          </div>
        </PortalMemberProvider>
      }
      right={
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          dashboard-dropdown-01 — studio block reference (settings, security, sign out)
        </div>
      }
      annotation={
        <ScoreAnnotation
          winner="keep-current"
          runnerUp="dashboard-dropdown-01"
          winnerScore={5}
          runnerUpScore={4.45}
          deltas={[
            { criterion: "PortalCompat", winner: 5, runnerUp: 4 },
            { criterion: "PatternFit", winner: 5, runnerUp: 5 },
            { criterion: "Consistency", winner: 5, runnerUp: 5 },
          ]}
          summary={row.winnerRationale}
        />
      }
    />
  ),
};
