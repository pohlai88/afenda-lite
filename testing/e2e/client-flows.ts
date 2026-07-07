import { expect, type Page } from "@/testing/e2e/playwright-base";
import type { ClientCreds } from "@/testing/e2e/credentials";

export async function loginAsClient(
  page: Page,
  creds: ClientCreds,
  options?: { expectOnboarding?: boolean },
) {
  await page.goto("/auth/sign-in");
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();

  if (options?.expectOnboarding) {
    await expect(page).toHaveURL(/\/client\/onboarding/);
    return;
  }

  await expect(page).toHaveURL(/\/client(?:\/|$)/);
}
