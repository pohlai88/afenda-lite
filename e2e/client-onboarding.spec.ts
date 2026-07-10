import { test } from "@/testing/e2e/playwright-base";
import {
  createE2eClientEmail,
  getClientDefaultPasswordFromEnv,
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator, expectClientRegisteredToast, registerClient } from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientPassword = getClientDefaultPasswordFromEnv();

const onboardingSkipMessage =
  "Set SHARED_ADMIN_* (or E2E_OPERATOR_*), CLIENT_DEFAULT_PASSWORD, and at least one declaration for onboarding E2E";

/**
 * Phase 3 current happy path ends at the unavailable stub after join
 * (`e2e/client-invitation-journey.spec.ts`). This file covers operator
 * invite issuance only — wizard completion is deferred until rebuild.
 */
test.describe("Client invite registration @journey", () => {
  test.skip(!operatorCreds, operatorSkipMessage);

  test("registers a client and sends an organization invitation", async ({
    page,
  }) => {
    test.skip(!clientPassword, onboardingSkipMessage);

    const email = createE2eClientEmail("onboarding");
    const fullName = "E2E Onboarding Client";

    await loginAsOperator(page, requireOperatorCreds());
    await registerClient(page, { fullName, email });
    await expectClientRegisteredToast(page);
  });
});
