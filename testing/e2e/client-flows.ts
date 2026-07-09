import { expect, type Page } from "@/testing/e2e/playwright-base";
import type { ClientCreds } from "@/testing/e2e/credentials";

async function fillClientSignInForm(page: Page, creds: ClientCreds) {
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.getByLabel(/^password$/i).fill(creds.password);
}

export async function submitClientSignIn(page: Page, creds: ClientCreds) {
  await fillClientSignInForm(page, creds);
  const signInButton = page.getByRole("button", { name: /^(sign in|login)$/i });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await signInButton.click();
    try {
      await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 20_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(1_500 * (attempt + 1));
      await fillClientSignInForm(page, creds);
    }
  }
}

export async function loginAsClient(
  page: Page,
  creds: ClientCreds,
  options?: { expectOnboarding?: boolean },
) {
  await page.goto("/auth/sign-in");
  await submitClientSignIn(page, creds);

  if (options?.expectOnboarding) {
    await expect(page).toHaveURL(/\/client\/onboarding/);
    return;
  }

  await expect(page).toHaveURL(/\/client(?:\/|$)/, { timeout: 30_000 });
}
