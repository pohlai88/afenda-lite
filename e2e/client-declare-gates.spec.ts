import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import { loginAsClient } from "@/testing/e2e/client-flows";
import {
  clientSkipMessage,
  getClientCreds,
  requireClientCreds,
} from "@/testing/e2e/credentials";
import {
  clearClientPortalAcknowledgement,
  expectClientDeclareNotFound,
  expectClientDeclareReceipt,
  expectClientDeclareRedirectsHome,
  getClientAssignmentIdForEmail,
  restoreClientPortalAcknowledgement,
} from "@/testing/e2e/client-declare-gates";

const clientCreds = getClientCreds();
const missingAssignmentId = "00000000-0000-4000-8000-000000000001";

test.describe("Client declare gates @journey", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!clientCreds, clientSkipMessage);
  });

  test("unknown assignment id shows client not-found page", async ({ page }) => {
    await loginAsClient(page, requireClientCreds());
    await expectClientDeclareNotFound(page, missingAssignmentId);
  });

  test("unacknowledged client is redirected from declare to dashboard", async ({
    page,
  }) => {
    const creds = requireClientCreds();
    let assignmentId: string;

    try {
      assignmentId = getClientAssignmentIdForEmail(creds.email);
      clearClientPortalAcknowledgement(creds.email);
      await loginAsClient(page, creds);
      await expectClientDeclareRedirectsHome(page, assignmentId);
    } finally {
      restoreClientPortalAcknowledgement(creds.email);
    }
  });

  test("submitted assignment shows receipt on declare route", async ({
    page,
  }) => {
    await loginAsClient(page, requireClientCreds());

    const viewReceipt = page
      .getByRole("button", { name: new RegExp(portalCopy.clientDashboard.viewReceipt, "i") })
      .first();
    const hasSubmittedAssignment = await viewReceipt
      .isVisible()
      .catch(() => false);
    test.skip(!hasSubmittedAssignment, "No submitted assignment for preview client");

    await viewReceipt.click();
    await expect(page).toHaveURL(/\/client\/declare\/.+/);
    await expectClientDeclareReceipt(page);
  });
});
