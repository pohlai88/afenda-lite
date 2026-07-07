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

export function requireOperatorCreds(): OperatorCreds {
  const creds = getOperatorCreds();
  if (!creds) {
    throw new Error(operatorSkipMessage);
  }
  return creds;
}

export const operatorSkipMessage =
  "Set SHARED_ADMIN_* or E2E_OPERATOR_* env vars for operator E2E";

export async function loginAsOperator(page: Page, creds: OperatorCreds) {
  await page.goto("/org/login");
  await page.getByLabel(/email/i).fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function createDeclaration(page: Page, title: string) {
  await page.getByLabel(/^title$/i).fill(title);
  await page.getByRole("button", { name: /create declaration/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/.+/);

  const match = page.url().match(/\/dashboard\/([^/?#]+)/);

  return {
    title,
    detailUrl: page.url(),
    slug: match?.[1],
  };
}

export async function openSurveyTab(page: Page, tab: "manage" | "share" | "submissions" | "danger") {
  const pattern =
    tab === "manage"
      ? /settings/i
      : tab === "share"
        ? /^share$/i
        : tab === "submissions"
          ? /submissions/i
          : /delete/i;
  await page.getByRole("tab", { name: pattern }).click();
}
