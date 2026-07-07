import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";
import type { OperatorCreds } from "@/testing/e2e/credentials";

export async function loginAsOperator(page: Page, creds: OperatorCreds) {
  await page.goto("/org/login");
  await page.waitForURL(/\/auth\/sign-in/);
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /declaration management/i }),
  ).toBeVisible();
}

export async function registerClient(
  page: Page,
  input: { fullName: string; email: string; declarationLabel?: string },
) {
  await page.goto("/dashboard/clients");
  await page.getByLabel(/full name/i).fill(input.fullName);
  await page.getByLabel(/recipient email/i).fill(input.email);

  const declarationSelect = page.getByLabel(/assign declaration/i);
  if (input.declarationLabel) {
    await declarationSelect.selectOption({ label: input.declarationLabel });
  } else {
    const firstAssignable = declarationSelect.locator("option").nth(1);
    const value = await firstAssignable.getAttribute("value");
    if (!value) {
      throw new Error("No declarations available to assign during client registration");
    }
    await declarationSelect.selectOption(value);
  }

  await page.getByRole("button", { name: /register client/i }).click();
}

export async function createDeclaration(page: Page, title: string) {
  const { create } = portalCopy.org;
  const { manage } = portalCopy.declarationDetail;

  await Promise.all([
    page.waitForURL(/\/dashboard\/[^/?#]+/, { timeout: 60_000 }),
    page.getByRole("button", { name: create.openSettings }).click(),
  ]);

  if (
    await page
      .getByRole("heading", { name: /something went wrong/i })
      .isVisible()
      .catch(() => false)
  ) {
    throw new Error(
      "Operator detail page hit the dashboard error boundary after create",
    );
  }

  const idMatch = page.url().match(/\/dashboard\/([^/?#]+)/);
  const id = idMatch?.[1];

  await page.getByLabel(/^title$/i).fill(title);
  await page.getByRole("button", { name: manage.save }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({
    timeout: 30_000,
  });

  await openSurveyTab(page, "share");
  const openLinkUrl =
    (
      await page
        .locator(".portal-code-block")
        .filter({ hasText: /\/survey\// })
        .first()
        .textContent()
    )?.trim() ?? "";
  const slug = openLinkUrl.match(/\/survey\/([^/\s?#]+)/)?.[1];

  return {
    title,
    detailUrl: page.url().split("?")[0] ?? page.url(),
    id,
    slug,
  };
}

export async function openSurveyTab(
  page: Page,
  tab: "manage" | "share" | "submissions" | "danger",
) {
  const labels = portalCopy.declarationDetail.tabs;
  const pattern =
    tab === "manage"
      ? new RegExp(labels.manage, "i")
      : tab === "share"
        ? new RegExp(labels.share, "i")
        : tab === "submissions"
          ? new RegExp(labels.submissions, "i")
          : new RegExp(labels.danger, "i");
  await page.getByRole("tab", { name: pattern }).click();
}

export async function expectDeclarationListed(page: Page, title: string) {
  await expect(page.getByRole("link", { name: title })).toBeVisible();
}

export async function deleteDeclarationFromDashboard(page: Page, title: string) {
  const { manage } = portalCopy.declarationDetail;
  const row = page.locator("tr").filter({ hasText: title });

  await row.getByRole("button", { name: portalCopy.org.list.tableActions }).click();
  await page.getByRole("menuitem", { name: manage.deleteSubmit }).click();
  const confirmDialog = page.getByRole("alertdialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog
    .getByRole("button", { name: manage.deleteSubmit })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
  await expect(page.getByRole("link", { name: title })).not.toBeVisible({
    timeout: 30_000,
  });
}
