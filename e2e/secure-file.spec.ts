import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import {
  expectDeclarationReceived,
  fillDefaultDeclarationAnswers,
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
  loginAsOperator,
  openSurveyTab,
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

    await page.getByRole("button", { name: /add question/i }).click();
    await page.locator("select").last().selectOption("file");
    await page
      .locator('input[name="questionPrompt"]')
      .last()
      .fill("Attach supporting document");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("Attach supporting document")).toBeVisible();

    const previewClient = requireClientCreds();
    await page.goto("/dashboard/clients");
    await page.getByLabel(/full name/i).fill("Preview Client");
    await page.getByLabel(/recipient email/i).fill(previewClient.email);
    await page.getByLabel(/assign declaration/i).selectOption({
      label: declarationTitle,
    });
    await page.getByRole("button", { name: /register client/i }).click();
    await expect(
      page.getByText(new RegExp(portalCopy.clientInvite.issued, "i")),
    ).toBeVisible();
  });

  test("signed-in client submits assignment with file metadata", async ({
    page,
  }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());
    await page.getByRole("link", { name: /complete declaration/i }).click();
    await expect(page).toHaveURL(/\/client\/declare\/.+/);

    await fillDefaultDeclarationAnswers(
      page,
      "E2E secure file submission context",
    );

    await page.locator('input[type="file"]').setInputFiles(evidenceFixturePath);
    await expect(page.getByText("sample-evidence.txt")).toBeVisible();

    await page.getByRole("button", { name: /submit declaration/i }).click();
    await expectDeclarationReceived(page, "client");
  });

  test("operator sees incremented submission count", async ({ page }) => {
    test.skip(!surveyDetailUrl, "Requires operator setup from prior test");

    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(surveyDetailUrl);
    await openSurveyTab(page, "share");

    await expect(
      page.getByText(portalCopy.org.list.submissions(1)),
    ).toBeVisible();
  });
});
