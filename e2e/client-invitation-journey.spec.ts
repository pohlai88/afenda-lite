import { test } from "@/testing/e2e/playwright-base";
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
import { runNodeScriptJson } from "@/testing/e2e/run-node-script";

function issueNeonOrgInvite(email: string, fullName: string) {
  const payload = runNodeScriptJson<{
    success: boolean;
    recipientEmail: string;
    fullName: string;
    neonAuthInvitationId?: string;
    joinUrl?: string;
    error?: string;
  }>("scripts/live-org-invite.mjs", [email, fullName]);

  if (!payload.success || !payload.neonAuthInvitationId || !payload.joinUrl) {
    throw new Error(`live-org-invite failed: ${JSON.stringify(payload)}`);
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
