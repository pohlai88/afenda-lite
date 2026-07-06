import { expect, test } from "@playwright/test";
import { portalCopy } from "../lib/portal-copy";
import {
  expectDeclarationReceived,
  submitDefaultDeclarationAnswers,
} from "./helpers/declaration";
import {
  createDeclaration,
  getOperatorCreds,
  loginAsOperator,
  operatorSkipMessage,
} from "./helpers/operator";

const operatorCreds = getOperatorCreds();

test.describe("Client journey @journey", () => {
  test.describe.configure({ mode: "serial" });

  const clientPassword = "E2eTestPass123!";
  let declarationTitle: string;
  let inviteUrl: string;

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("operator creates declaration and issues client invite", async ({
    page,
  }) => {
    const creds = getOperatorCreds();
    if (!creds) test.skip(true, operatorSkipMessage);
    await loginAsOperator(page, creds);
    const created = await createDeclaration(
      page,
      `E2E client journey ${Date.now()}`,
    );
    declarationTitle = created.title;

    await page.goto("/dashboard/clients");
    const clientEmail = `e2e+${Date.now()}@example.test`;
    await page.getByLabel(/full name/i).fill("E2E Test Client");
    await page.getByLabel(/recipient email/i).fill(clientEmail);
    await page.locator('select[name="surveyId"]').selectOption({
      label: declarationTitle,
    });
    await page.getByRole("button", { name: /issue invitation/i }).click();

    await expect(
      page.getByText(new RegExp(portalCopy.clientInvite.issued, "i")),
    ).toBeVisible();
    const inviteLink = page.locator(".portal-code-block").first();
    await expect(inviteLink).toBeVisible();
    inviteUrl = (await inviteLink.textContent())?.trim() ?? "";
    expect(inviteUrl).toMatch(/\/invite\//);
  });

  test("client accepts invite, onboards, and submits assignment", async ({
    browser,
  }) => {
    test.skip(!inviteUrl, "Requires invite URL from prior test");

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(inviteUrl);
    await expect(
      page.getByRole("heading", { name: /accept invitation/i }),
    ).toBeVisible();

    await page.getByLabel(/^password$/i).fill(clientPassword);
    await page.getByLabel(/confirm password/i).fill(clientPassword);
    await page.getByRole("button", { name: /activate account/i }).click();
    await expect(page).toHaveURL(/\/client\/onboarding/);

    await page.getByLabel(/phone/i).fill("+1 555 0100");
    await page.getByLabel(/entity name/i).fill("E2E Test Entity");
    await page.getByLabel(/jurisdiction/i).fill("US-CA");
    await page.getByRole("button", { name: /save and continue/i }).click();
    await expect(page).toHaveURL(/\/client$/);

    await page.getByRole("link", { name: /complete declaration/i }).click();
    await expect(page).toHaveURL(/\/client\/declare\/.+/);

    await submitDefaultDeclarationAnswers(
      page,
      "E2E client journey attestation context",
    );
    await expectDeclarationReceived(page, "client");
    await expect(page.getByText(/^CDP-/)).toBeVisible();

    await context.close();
  });
});
