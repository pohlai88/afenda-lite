import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  answerFirstYesNoQuestion,
  expectDeclarationReceived,
  openFirstClientAssignment,
  submitClientDeclaration,
} from "@/testing/e2e/declaration-flows";
import { evidenceFixturePath } from "@/testing/e2e/fixtures";
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
  openSurveyTab,
  registerClient,
} from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientCreds = getClientCreds();

test.describe("Client assignment and file evidence @journey", () => {
  test.describe.configure({ mode: "serial" });

  let surveyDetailUrl: string;
  let declarationTitle: string;

  test.beforeEach(() => {
    test.skip(!operatorCreds || !clientCreds, operatorSkipMessage);
  });

  test("operator creates declaration, adds file question, assigns preview client", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    const created = await createDeclaration(
      page,
      `E2E secure file ${Date.now()}`,
    );
    declarationTitle = created.title;
    surveyDetailUrl = created.detailUrl;

    await openSurveyTab(page, "manage");
    await page.getByRole("button", { name: /add question/i }).click();
    await page.getByLabel(/question \d+ type/i).last().selectOption("file");
    await page
      .getByRole("textbox", { name: /question \d+ prompt/i })
      .last()
      .fill("Attach supporting document");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(
      page.getByRole("textbox", { name: /question \d+ prompt/i }).last(),
    ).toHaveValue("Attach supporting document");

    const previewClient = requireClientCreds();
    await registerClient(page, {
      fullName: "Preview Client",
      email: previewClient.email,
      declarationLabel: declarationTitle,
    });
    await expectClientRegisteredToast(page);
  });

  test("signed-in client submits assignment with file metadata", async ({
    page,
  }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await openFirstClientAssignment(page, declarationTitle);

    await answerFirstYesNoQuestion(page);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page
      .getByPlaceholder(/enter your response/i)
      .fill("E2E secure file submission context");
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.locator('input[type="file"]').setInputFiles(evidenceFixturePath);
    await expect(page.getByText("sample-evidence.pdf")).toBeVisible();

    await page.getByRole("button", { name: /^continue$/i }).click();
    await submitClientDeclaration(page);
    await expectDeclarationReceived(page, "client");
  });

  test("operator sees file metadata on submissions tab", async ({ page }) => {
    test.skip(!surveyDetailUrl, "Requires operator setup from prior test");

    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(surveyDetailUrl);
    await openSurveyTab(page, "submissions");

    const viewAnswersButton = page.getByRole("button", {
      name: new RegExp(portalCopy.declarationDetail.submissions.viewAnswers, "i"),
    }).first();
    await expect(viewAnswersButton).toBeVisible();
    await viewAnswersButton.click();

    await expect(page.getByText("sample-evidence.pdf")).toBeVisible();
    await expect(page.getByText("E2E secure file submission context")).toBeVisible();
    await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  });
});
