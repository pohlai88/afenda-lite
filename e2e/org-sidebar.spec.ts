import { expect, test } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const { nav } = portalCopy;

test.describe("Org sidebar navigation @journey", () => {
  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("sidebar links match canonical org routes", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/dashboard");

    await page
      .getByRole("link", { name: nav.clientInvitations, exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/clients$/);

    await page
      .locator('[data-sidebar="sidebar"]')
      .getByRole("link", { name: nav.declarations, exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/clients");
    await expect(
      page.getByRole("heading", { name: portalCopy.clientInvitationsPage.title }),
    ).toBeVisible();
  });
});
