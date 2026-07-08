import type { Meta, StoryObj } from "@storybook/react";
import { getEvaluationRow } from "@/lib/ui-decision-matrix";
import { ComparisonGrid, ScoreAnnotation } from "./evaluation-primitives";
import {
  IamCheckAuthMagicLinkShellPreview,
  IamCheckAuthOrganizationShellPreview,
  IamCheckAuthOtpShellPreview,
  IamCheckAuthShellPreview,
  IamCheckClientJoinAcceptShellPreview,
  IamCheckClientJoinOtpShellPreview,
  IamCheckClientJoinSignupShellPreview,
  RejectedStudioAuthPanel,
} from "./auth-shell-preview";

const row = getEvaluationRow("shell-auth")!;

const meta: Meta = {
  title: "UI Evaluation/Auth Shell",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const IamCheckVaultShell: Story = {
  name: "iam-check vault shell (winner)",
  render: () => (
    <ComparisonGrid
      left={<IamCheckAuthShellPreview />}
      right={<RejectedStudioAuthPanel />}
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

export const IamCheckAuthShellOnly: Story = {
  name: "iam-check auth shell only",
  render: () => <IamCheckAuthShellPreview />,
};

export const IamCheckEmailOtpShell: Story = {
  name: "iam-check email OTP shell",
  render: () => <IamCheckAuthOtpShellPreview />,
};

export const IamCheckMagicLinkShell: Story = {
  name: "iam-check magic link shell",
  render: () => <IamCheckAuthMagicLinkShellPreview />,
};

export const IamCheckOrganizationShell: Story = {
  name: "iam-check organization invitation shell",
  render: () => <IamCheckAuthOrganizationShellPreview />,
};

export const IamCheckClientJoinSignupShell: Story = {
  name: "iam-check client join — create account",
  render: () => <IamCheckClientJoinSignupShellPreview />,
};

export const IamCheckClientJoinOtpShell: Story = {
  name: "iam-check client join — verify email",
  render: () => <IamCheckClientJoinOtpShellPreview />,
};

export const IamCheckClientJoinAcceptShell: Story = {
  name: "iam-check client join — accept invitation",
  render: () => <IamCheckClientJoinAcceptShellPreview />,
};
