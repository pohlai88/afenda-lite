import path from "node:path";
import { expect, test } from "@playwright/test";
import { portalCopy } from "../lib/portal-copy";
import {
  expectDeclarationReceived,
  fillDefaultDeclarationAnswers,
  secureLinkLocator,
} from "./helpers/declaration";
import {
  createDeclaration,
  getOperatorCreds,
  loginAsOperator,
  openSurveyTab,
  operatorSkipMessage,
  requireOperatorCreds,
} from "./helpers/operator";

const operatorCreds = getOperatorCreds();
const evidenceFixture = path.join(
  __dirname,
  "fixtures",
  "sample-evidence.txt",
);

test.describe("Secure link and file evidence @journey", () => {
  test.describe.configure({ mode: "serial" });

  let surveyDetailUrl: string;
  let secureUrl: string;

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("operator creates declaration and adds file question", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    const created = await createDeclaration(
      page,
      `E2E secure file ${Date.now()}`,
    );
    surveyDetailUrl = created.detailUrl;

    await page.getByRole("button", { name: /add question/i }).click();
    await page.locator("select").last().selectOption("file");
    await page
      .locator('input[name="questionPrompt"]')
      .last()
      .fill("Attach supporting document");
    await page.getByRole("button", { name: /save changes/i }).click();

    await openSurveyTab(page, "share");
    const secureLink = secureLinkLocator(page);
    await expect(secureLink).toBeVisible();
    secureUrl = (await secureLink.textContent())?.trim() ?? "";
    expect(secureUrl).toMatch(/\/f\//);
  });

  test("recipient submits via secure link with file metadata", async ({
    page,
  }) => {
    test.skip(!secureUrl, "Requires operator setup from prior test");

    await page.goto(secureUrl);
    await expect(
      page.getByText(portalCopy.product.secureAccessEyebrow),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /complete your declaration/i }),
    ).toBeVisible();

    await fillDefaultDeclarationAnswers(
      page,
      "E2E secure file submission context",
    );

    await page.locator('input[type="file"]').setInputFiles(evidenceFixture);
    await expect(page.getByText("sample-evidence.txt")).toBeVisible();

    await page.getByRole("button", { name: /submit declaration/i }).click();
    await expectDeclarationReceived(page);
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
