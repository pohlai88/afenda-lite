import type { Meta, StoryObj } from "@storybook/react";
import { ClientDeclarantProfileView } from "@/components/client-declarant-profile-view";
import { PortalFormSection } from "@/components/portal-form-section";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { productionSeedFixtures } from "@/lib/production-fixtures";
import { portalCopy } from "@/lib/portal-copy";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";
import {
  syncedPreviewClientProfile,
  syncedProductionFixtureLabel,
} from "./synced-production-fixtures";

const row = getEvaluationRow("client-profile")!;
const syncedProfile = syncedPreviewClientProfile();
const { previewClient } = productionSeedFixtures;

function FormLayout01Reference() {
  return (
    <PortalFormSection
      title="Identity"
      description="form-layout-01 section shell with read-only field grid."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">Full legal name</div>
          <div className="h-10 rounded-md border bg-muted/30" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Nationality</div>
          <div className="h-10 rounded-md border bg-muted/30" />
        </div>
      </div>
    </PortalFormSection>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Client Profile",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const SyncedProductionFixture: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Production seed: {syncedProductionFixtureLabel()}
      </p>
      <ClientDeclarantProfileView
        email={previewClient.email}
        profile={syncedProfile}
      />
    </div>
  ),
};

export const DeclarantProfileRedesign: Story = {
  render: () => (
    <ComparisonGrid
      left={
        <div className="mx-auto max-w-3xl">
          <ClientDeclarantProfileView
            email={previewClient.email}
            profile={syncedProfile}
          />
        </div>
      }
      right={
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-xl font-semibold">{syncedProfile.fullLegalName}</p>
            <p className="text-sm text-muted-foreground">
              {syncedProfile.entityName} · {syncedProfile.jurisdiction}
            </p>
          </div>
          <FormLayout01Reference />
        </div>
      }
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
          summary={`${row.winnerRationale} PortalProfileField adopts form-layout-01 read-only rows; summary card borrows account-settings-01 section chrome.`}
        />
      }
    />
  ),
};

export const ProfileViewOnly: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl p-6">
      <ClientDeclarantProfileView
        email={previewClient.email}
        profile={syncedProfile}
      />
    </div>
  ),
};

export const ProfileCopyReference: Story = {
  render: () => (
    <div className="mx-auto max-w-lg space-y-2 p-6 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{portalCopy.clientProfile.title}</p>
      <p>{portalCopy.clientProfile.description}</p>
      <p>{portalCopy.clientProfile.correctionNotice}</p>
    </div>
  ),
};
