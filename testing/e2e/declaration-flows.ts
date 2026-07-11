import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

function reviewConfirmSwitch(page: Page) {
  return page.getByRole("switch", { name: /reviewed my responses/i });
}

function declarationTextField(page: Page) {
  return page.locator("main").getByRole("textbox").first();
}

async function waitForDeclarationStepAction(page: Page) {
  const nextAction = page
    .getByRole("button", { name: /^continue$/i })
    .or(page.getByRole("button", { name: /submit declaration/i }));
  await expect(nextAction.first()).toBeVisible({ timeout: 20_000 });
  await expect(nextAction.first()).toBeEnabled({ timeout: 20_000 });
}

async function clickContinueAndWaitForStepChange(page: Page) {
  await waitForDeclarationStepAction(page);
  const stepIndicator = page.getByText(/^Step \d+ of \d+$/i).first();
  const stepBefore = (await stepIndicator.textContent()) ?? "";
  await page.getByRole("button", { name: /^continue$/i }).click();
  if (stepBefore) {
    await expect(stepIndicator).not.toHaveText(stepBefore, { timeout: 20_000 });
    return;
  }
  await expect(
    page.getByRole("heading", { name: /^review and submit$/i }),
  ).toBeVisible({ timeout: 20_000 });
}

export async function advanceToReviewStep(page: Page, contextText?: string) {
  const reviewSwitch = reviewConfirmSwitch(page);

  for (let step = 0; step < 8; step += 1) {
    if (await reviewSwitch.isVisible().catch(() => false)) {
      return;
    }

    await waitForDeclarationStepAction(page);

    const yesRadio = page.getByRole("radio", { name: /^yes$/i }).first();
    if (await yesRadio.isVisible().catch(() => false)) {
      await yesRadio.check();
      await waitForDeclarationStepAction(page);
    }

    const textField = declarationTextField(page);
    if (await textField.isVisible().catch(() => false) && contextText) {
      await textField.fill(contextText);
      await waitForDeclarationStepAction(page);
    }

    const continueButton = page.getByRole("button", { name: /^continue$/i });
    if (await continueButton.isVisible().catch(() => false)) {
      await clickContinueAndWaitForStepChange(page);
      continue;
    }

    break;
  }

  await expect(reviewSwitch).toBeVisible({ timeout: 15_000 });
}

export async function fillDefaultDeclarationAnswers(
  page: Page,
  contextText: string,
) {
  await advanceToReviewStep(page, contextText);
}

export async function submitDefaultDeclarationAnswers(
  page: Page,
  contextText: string,
) {
  await fillDefaultDeclarationAnswers(page, contextText);
  await submitClientDeclaration(page);
}

export async function expectDeclarationReceived(
  page: Page,
  mode: "public" | "client" = "public",
) {
  if (mode === "client") {
    await expect(page.getByText(/^CDP-/)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(portalCopy.clientDashboard.receiptDescription),
    ).toBeVisible();
    return;
  }

  await expect(
    page.getByText(portalCopy.declarationForm.thankYouTitle, { exact: true }),
  ).toBeVisible();
}

export function secureLinkLocator(page: Page) {
  return page.locator(".portal-code-block").filter({ hasText: /\/f\// });
}

export async function ensureAttestationsStep(page: Page) {
  const attestations = page.getByRole("button", { name: /^attestations\b/i });
  if (await attestations.isVisible().catch(() => false)) {
    await attestations.click();
  }
  await expect(page.getByRole("radio", { name: /^yes$/i }).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function answerFirstYesNoQuestion(page: Page) {
  await ensureAttestationsStep(page);
  const yesRadio = page.getByRole("radio", { name: /^yes$/i }).first();
  await expect(yesRadio).toBeVisible();
  await yesRadio.check();
}

export async function submitClientDeclaration(page: Page) {
  const reviewSwitch = reviewConfirmSwitch(page);
  await expect(reviewSwitch).toBeVisible({ timeout: 15_000 });
  await reviewSwitch.click();
  await page.getByRole("button", { name: /submit declaration/i }).click();
}

export async function openFirstClientAssignment(page: Page, title?: string) {
  if (title) {
    const row = page.locator("li").filter({ hasText: title });
    await row
      .getByRole("button", { name: /continue declaration|complete declaration/i })
      .or(row.getByRole("link", { name: /continue declaration|complete declaration/i }))
      .first()
      .click();
  } else {
    const assignmentCta = page
      .getByRole("link", { name: /continue declaration|complete declaration/i })
      .or(
        page.getByRole("button", {
          name: /continue declaration|complete declaration/i,
        }),
      )
      .first();
    await assignmentCta.click();
  }

  await expect(page).toHaveURL(/\/client\/declare\/.+/);
}
