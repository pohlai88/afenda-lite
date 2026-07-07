import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import {
  createE2eClientEmail,
  getClientDefaultPasswordFromEnv,
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsClient } from "@/testing/e2e/client-flows";
import { completeClientOnboardingWizard } from "@/testing/e2e/onboarding-flows";
import { loginAsOperator, registerClient } from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientPassword = getClientDefaultPasswordFromEnv();

const onboardingSkipMessage =
  "Set SHARED_ADMIN_* (or E2E_OPERATOR_*), CLIENT_DEFAULT_PASSWORD, and at least one declaration for onboarding E2E";

test.describe("Client onboarding wizard @journey", () => {
  test.skip(!operatorCreds || !clientPassword, onboardingSkipMessage);

  test("registers a client and completes the four-step declarant profile", async ({
    page,
  }) => {
    const email = createE2eClientEmail("onboarding");
    const fullName = "E2E Onboarding Client";

    await loginAsOperator(page, requireOperatorCreds());
    await registerClient(page, { fullName, email });
    await expect(
      page.getByText(new RegExp(portalCopy.clientInvite.issued, "i")),
    ).toBeVisible();

    await loginAsClient(
      page,
      { email, password: clientPassword! },
      { expectOnboarding: true },
    );

    await completeClientOnboardingWizard(page, {
      fullLegalName: fullName,
    });

    await expect(
      page.getByText(new RegExp(portalCopy.clientDashboard.title, "i")),
    ).toBeVisible();
  });
});
