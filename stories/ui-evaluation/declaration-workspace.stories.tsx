import type { Meta, StoryObj } from "@storybook/react";
import { PortalDeclarationWorkspace } from "@/components/portal-declaration-workspace";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { DeclarationSettingsSection } from "@/components/declaration-settings-section";
import { PortalEmptyStateCard } from "@/components/portal-empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { portalCopy } from "@/lib/portal-copy";
import { InboxIcon } from "lucide-react";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";

const detailRow = getEvaluationRow("admin-declaration-detail")!;

const sampleSurvey = {
  id: "decl-preview-001",
  userId: "operator-preview",
  title: "Director statutory declaration",
  question: "Annual compliance attestation for board members.",
  slug: "director-statutory-declaration",
  referenceNumber: "REF-2026-014",
  caseNumber: "CASE-2048",
  effectiveDate: new Date("2026-07-01"),
  submitBefore: new Date("2026-08-15"),
  surveyorName: "Jane Operator",
  surveyorOrg: "Acme Compliance Ltd",
  surveyeeIndividual: null,
  surveyeeOrg: "Example Holdings",
  purpose: "FY2026 board attestation",
  categories: ["compliance", "annual"],
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-07-01"),
};

function DeclarationWorkspacePreview() {
  const { declarationDetail } = portalCopy;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <PortalEyebrow className="mb-2">{declarationDetail.eyebrow}</PortalEyebrow>
        <h1 className="portal-page-title">{sampleSurvey.title}</h1>
        <p className="portal-page-description">{sampleSurvey.question}</p>
      </header>

      <PortalDeclarationWorkspace
        survey={sampleSurvey}
        responseCount={2}
        questionCount={4}
        labels={declarationDetail.tabs}
        manage={
          <DeclarationSettingsSection
            title={declarationDetail.manage.sections.caseDetails.title}
            description={declarationDetail.manage.sections.caseDetails.description}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-10 rounded border bg-muted/20" />
              <div className="h-10 rounded border bg-muted/20" />
            </div>
          </DeclarationSettingsSection>
        }
        share={
          <Card>
            <CardHeader>
              <CardTitle className="portal-card-title">
                {declarationDetail.share.title}
              </CardTitle>
              <CardDescription>{declarationDetail.share.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded border border-dashed bg-muted/20" />
            </CardContent>
          </Card>
        }
        submissions={
          <PortalEmptyStateCard
            icon={InboxIcon}
            title={declarationDetail.submissions.emptyTitle}
            description={declarationDetail.submissions.empty}
          />
        }
      />
    </div>
  );
}

function LegacyFourTabMock() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Duplicate metadata card + four peer tabs (including Delete)
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-4 border-b text-center text-xs">
          {["Settings", "Share", "Submissions", "Delete"].map((tab) => (
            <div key={tab} className="border-r px-2 py-4 last:border-r-0">
              {tab}
            </div>
          ))}
        </div>
        <div className="h-40 bg-muted/20" />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Declaration Workspace",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const WorkspaceVsLegacyTabs: Story = {
  render: () => (
    <ComparisonGrid
      left={<DeclarationWorkspacePreview />}
      right={<LegacyFourTabMock />}
      annotation={
        <ScoreAnnotation
          winner="dashboard-shell-05"
          runnerUp="keep-current"
          winnerScore={4.25}
          runnerUpScore={4.2}
          deltas={[
            { criterion: "PatternFit", winner: 4, runnerUp: 4 },
            { criterion: "Consistency", winner: 5, runnerUp: 4 },
          ]}
          summary={detailRow.winnerRationale}
        />
      }
    />
  ),
};
