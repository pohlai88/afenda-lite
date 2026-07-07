import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import {
  expectDeclarationReceived,
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
  loginAsOperator,
} from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientCreds = getClientCreds();

test.describe("Client journey @journey", () => {
  test.describe.configure({ mode: "serial" });

  let declarationTitle: string;

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

  test("client signs in and submits assignment", async ({ page }) => {
    test.skip(!clientCreds, clientSkipMessage);

    await loginAsClient(page, requireClientCreds());

    await page
      .getByRole("checkbox", {
        name: new RegExp(portalCopy.clientDashboard.acknowledgement.switchLabel, "i"),
      })
      .check();
    await page
      .getByRole("button", { name: /confirm acknowledgement/i })
      .click();
    await expect(
      page.getByText(/responsibilities acknowledged on/i),
    ).toBeVisible();

    await page.getByRole("link", { name: /complete declaration/i }).click();
    await expect(page).toHaveURL(/\/client\/declare\/.+/);

    await submitDefaultDeclarationAnswers(
      page,
      "E2E client journey attestation context",
    );
    await expectDeclarationReceived(page, "client");
    await expect(page.getByText(/^CDP-/)).toBeVisible();
  });
});
