import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  answerFirstYesNoQuestion,
  ensureAttestationsStep,
  expectDeclarationReceived,
  openFirstClientAssignment,
  submitDefaultDeclarationAnswers,
} from "@/testing/e2e/declaration-flows";
import {
  clientSkipMessage,
  getClientCreds,
  getOperatorCreds,
  operatorSkipMessage,
  requireClientCreds,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsClient } from "@/testing/e2e/client-flows";
import {
  createDeclaration,
  expectClientRegisteredToast,
  loginAsOperator,
  openDeclarationFromDashboard,
  openSurveyTab,
  registerClient,
} from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientCreds = getClientCreds();

async function acknowledgePortalIfNeeded(page: import("@playwright/test").Page) {
  const acknowledgementSwitch = page.getByRole("checkbox", {
    name: new RegExp(portalCopy.clientDashboard.acknowledgement.switchLabel, "i"),
  });
  if (await acknowledgementSwitch.isVisible().catch(() => false)) {
    await acknowledgementSwitch.check();
    await page
      .getByRole("button", { name: /confirm acknowledgement/i })
      .click();
    await expect(
      page.getByText(/responsibilities acknowledged on/i),
    ).toBeVisible();
  }
}

test.describe("Client journey @journey", () => {
  test.describe.configure({ mode: "serial" });

  let declarationTitle: string;
  let surveyDetailUrl: string;
  let submittedConfirmationCode: string | undefined;
  const attestationContext = "E2E client journey attestation context";

  test.beforeEach(() => {
    test.skip(!operatorCreds || !clientCreds, operatorSkipMessage);
  });

  test("operator creates declaration and assigns preview client", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    const created = await createDeclaration(
      page,
      `E2E client journey ${Date.now()}`,
    );
    declarationTitle = created.title;
    surveyDetailUrl = created.detailUrl;

    const previewClient = requireClientCreds();
    await registerClient(page, {
      fullName: "Preview Client",
      email: previewClient.email,
      declarationLabel: declarationTitle,
    });

    await expectClientRegisteredToast(page);
  });

  test("client draft is restored after reload", async ({ page }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await acknowledgePortalIfNeeded(page);

    await openFirstClientAssignment(page, declarationTitle);

    await answerFirstYesNoQuestion(page);
    await expect(page.getByText(/progress saved/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await ensureAttestationsStep(page);
    await expect(page.getByRole("radio", { name: /^yes$/i }).first()).toBeChecked({
      timeout: 15_000,
    });
  });

  test("client draft survives navigate away without Continue @journey", async ({
    page,
  }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await acknowledgePortalIfNeeded(page);

    await openFirstClientAssignment(page, declarationTitle);
    await answerFirstYesNoQuestion(page);

    await page.goto("/client");
    await expect(page).toHaveURL(/\/client$/);

    await openFirstClientAssignment(page, declarationTitle);
    await ensureAttestationsStep(page);
    await expect(
      page.getByRole("radio", { name: /^yes$/i }).first(),
    ).toBeChecked({ timeout: 15_000 });
  });

  test("client draft autosaves without Continue @journey", async ({ page }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await acknowledgePortalIfNeeded(page);

    await openFirstClientAssignment(page, declarationTitle);
    await answerFirstYesNoQuestion(page);

    await expect(page.getByText(/progress saved/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/client");
    await openFirstClientAssignment(page, declarationTitle);
    await ensureAttestationsStep(page);
    await expect(
      page.getByRole("radio", { name: /^yes$/i }).first(),
    ).toBeChecked();
  });

  test("client signs in and submits assignment", async ({ page }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await acknowledgePortalIfNeeded(page);

    await openFirstClientAssignment(page, declarationTitle);

    await submitDefaultDeclarationAnswers(page, attestationContext);
    await expectDeclarationReceived(page, "client");
    const code = await page.locator("text=/^CDP-/").first().textContent();
    submittedConfirmationCode = code?.trim();
    await expect(page.getByText(/^CDP-/)).toBeVisible();
  });

  test("operator sees matching submission answers", async ({ page }) => {
    test.skip(!surveyDetailUrl, "Requires operator setup from prior test");

    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(surveyDetailUrl);
    await openSurveyTab(page, "submissions");

    const viewAnswersButton = page.getByRole("button", {
      name: new RegExp(portalCopy.declarationDetail.submissions.viewAnswers, "i"),
    }).first();
    await expect(viewAnswersButton).toBeVisible();
    await viewAnswersButton.click();

    await expect(page.getByText(attestationContext)).toBeVisible();
    if (submittedConfirmationCode) {
      await expect(page.getByText(submittedConfirmationCode).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  });
});
