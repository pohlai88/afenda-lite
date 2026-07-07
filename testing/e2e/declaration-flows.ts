import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";

export async function fillDefaultDeclarationAnswers(
  page: Page,
  contextText: string,
) {
  while (true) {
    const yesRadio = page.getByRole("radio", { name: /^yes$/i }).first();
    if (await yesRadio.isVisible().catch(() => false)) {
      await yesRadio.check();
    }

    const textField = page.getByPlaceholder(/enter your response/i);
    if (await textField.isVisible().catch(() => false)) {
      await textField.fill(contextText);
    }

    const continueButton = page.getByRole("button", { name: /^continue$/i });
    const submitButton = page.getByRole("button", { name: /submit declaration/i });

    if (await submitButton.isVisible().catch(() => false)) {
      const reviewSwitch = page.getByRole("switch");
      if (await reviewSwitch.isVisible().catch(() => false)) {
        await reviewSwitch.check();
      }
      break;
    }

    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      continue;
    }

    break;
  }
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
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

export function secureLinkLocator(page: Page) {
  return page.locator(".portal-code-block").filter({ hasText: /\/f\// });
}
