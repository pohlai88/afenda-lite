import { expect, type Page } from "@playwright/test";

export type ClientCreds = { email: string; password: string };

export function getClientCreds(): ClientCreds | null {
  const email =
    process.env.E2E_CLIENT_EMAIL ?? process.env.PREVIEW_CLIENT_EMAIL;
  const password =
    process.env.E2E_CLIENT_PASSWORD ??
    process.env.CLIENT_DEFAULT_PASSWORD ??
    process.env.PREVIEW_CLIENT_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function requireClientCreds(): ClientCreds {
  const creds = getClientCreds();
  if (!creds) {
    throw new Error(clientSkipMessage);
  }
  return creds;
}

export const clientSkipMessage =
  "Set PREVIEW_CLIENT_* or E2E_CLIENT_* env vars for client E2E";

export async function loginAsClient(page: Page, creds: ClientCreds) {
  await page.goto("/");
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/client(?:\/|$)/);
}
