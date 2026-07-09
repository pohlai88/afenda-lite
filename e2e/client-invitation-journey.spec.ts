import { test } from "@/testing/e2e/playwright-base";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  acceptOrganizationInvitation,
  acknowledgeClientDashboard,
  completeClientOnboardingWizard,
  openFirstAssignedDeclaration,
  requireClientDefaultPassword,
  signUpOnJoinPage,
  verifyJoinEmailForE2e,
} from "@/testing/e2e/client-invitation-flows";
import { createE2eClientEmail } from "@/testing/e2e/credentials";

function issueNeonOrgInvite(email: string, fullName: string) {
  const output = execFileSync(
    process.execPath,
    [
      "--env-file=.env",
      resolve("scripts/live-org-invite.mjs"),
      email,
      fullName,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`live-org-invite did not return JSON:\n${output}`);
  }

  const payload = JSON.parse(output.slice(start, end + 1)) as {
    success: boolean;
    recipientEmail: string;
    fullName: string;
    neonAuthInvitationId?: string;
    joinUrl?: string;
    error?: string;
  };

  if (!payload.success || !payload.neonAuthInvitationId || !payload.joinUrl) {
    throw new Error(`live-org-invite failed: ${output}`);
  }

  return {
    email: payload.recipientEmail,
    fullName: payload.fullName,
    neonAuthInvitationId: payload.neonAuthInvitationId,
    joinUrl: payload.joinUrl,
    password: requireClientDefaultPassword(),
  };
}

test.describe("Client invitation join journey @journey", () => {
  test.setTimeout(120_000);

  test("invite → join → accept → onboarding → declaration workspace", async ({
    page,
  }) => {
    const email = createE2eClientEmail("invite-journey");
    const fullName = "E2E Invite Journey Client";
    const password = requireClientDefaultPassword();
    const journey = issueNeonOrgInvite(email, fullName);

    await signUpOnJoinPage(page, { ...journey, password });
    await verifyJoinEmailForE2e(page, journey.email);
    await acceptOrganizationInvitation(page);
    await completeClientOnboardingWizard(page, fullName);
    await acknowledgeClientDashboard(page);
    await openFirstAssignedDeclaration(page);
  });
});
