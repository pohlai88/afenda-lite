import { expect, test } from "@/testing/e2e/playwright-base";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/organization-admin-flows";

const operatorCreds = getOperatorCreds();

test.describe("Organization admin platform roles @journey", () => {
  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("roles and permissions pages load for operator", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());

    await page.goto("/dashboard/roles");
    await expect(
      page.getByRole("heading", { name: "Roles", exact: true }),
    ).toBeVisible();

    await page.goto("/dashboard/permissions");
    await expect(
      page.getByRole("heading", { name: "Permissions", exact: true }),
    ).toBeVisible();
  });

  test("operator can open user detail and see platform role assign UI", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/dashboard/users");

    const firstUserLink = page.getByRole("link").filter({ hasText: /@/ }).first();
    await expect(firstUserLink).toBeVisible({ timeout: 30_000 });
    await firstUserLink.click();

    await expect(
      page.getByText(/Platform product roles/i),
    ).toBeVisible({ timeout: 30_000 });

    const assignButton = page.getByTestId("platform-role-assign");
    if (await assignButton.count()) {
      await expect(assignButton).toBeVisible();
    }
  });
});
