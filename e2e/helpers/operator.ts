import { expect, type Page } from "@playwright/test";

export type OperatorCreds = { email: string; password: string };

export function getOperatorCreds(): OperatorCreds | null {
  const email =
    process.env.E2E_OPERATOR_EMAIL ?? process.env.SHARED_ADMIN_EMAIL;
  const password =
    process.env.E2E_OPERATOR_PASSWORD ?? process.env.SHARED_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export const operatorSkipMessage =
  "Set SHARED_ADMIN_* or E2E_OPERATOR_* env vars for operator E2E";

export async function loginAsOperator(page: Page, creds: OperatorCreds) {
  await page.goto("/org/login");
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function createDeclaration(page: Page, title: string) {
  await page.getByLabel(/^title$/i).fill(title);
  await page.getByRole("button", { name: /create declaration/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/.+/);

  const publicLink = page
    .locator(".portal-code-block")
    .filter({ hasText: /\/survey\// });
  await expect(publicLink).toBeVisible();
  const href = await publicLink.textContent();
  const match = href?.match(/\/survey\/([^/\s]+)/);

  return {
    title,
    detailUrl: page.url(),
    publicSlug: match?.[1],
  };
}
