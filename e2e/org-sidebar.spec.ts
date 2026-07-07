import { expect, test } from "@playwright/test";
import { portalCopy } from "../lib/portal-copy";
import {
  getOperatorCreds,
  loginAsOperator,
  operatorSkipMessage,
  requireOperatorCreds,
} from "./helpers/operator";

const operatorCreds = getOperatorCreds();
const { nav } = portalCopy;

test.describe("Org sidebar navigation", () => {
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

    await page.getByRole("link", { name: nav.declarations, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/clients");
    await expect(
      page.getByRole("heading", { name: portalCopy.clientInvitationsPage.title }),
    ).toBeVisible();
  });
});
