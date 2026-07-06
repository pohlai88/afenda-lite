import { expect, type Page } from "@playwright/test";
import { portalCopy } from "../../lib/portal-copy";

export async function fillDefaultDeclarationAnswers(
  page: Page,
  contextText: string,
) {
  await page.getByRole("button", { name: /^yes$/i }).first().click();
  await page.getByPlaceholder(/enter your response/i).fill(contextText);
}

export async function submitDefaultDeclarationAnswers(
  page: Page,
  contextText: string,
) {
  await fillDefaultDeclarationAnswers(page, contextText);
  await page.getByRole("button", { name: /submit declaration/i }).click();
}

export async function expectDeclarationReceived(
  page: Page,
  mode: "public" | "client" = "public",
) {
  const title =
    mode === "client"
      ? portalCopy.clientDashboard.receiptTitle
      : portalCopy.declarationForm.thankYouTitle;
  await expect(
    page.getByRole("heading", { name: new RegExp(title, "i") }),
  ).toBeVisible();
}

export function secureLinkLocator(page: Page) {
  return page.locator(".portal-code-block").filter({ hasText: /\/f\// });
}
