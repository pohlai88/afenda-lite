import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { OperatorCreds } from "@/testing/e2e/credentials";
import { selectRadixOption } from "@/testing/e2e/radix-select";

async function fillOperatorSignInForm(page: Page, creds: OperatorCreds) {
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.getByLabel(/^password$/i).fill(creds.password);
}

export async function submitOperatorSignIn(page: Page, creds: OperatorCreds) {
  await fillOperatorSignInForm(page, creds);
  const signInButton = page.getByRole("button", { name: /^(sign in|login)$/i });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await signInButton.click();
    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(1_500 * (attempt + 1));
      await fillOperatorSignInForm(page, creds);
    }
  }
}

export async function loginAsOperator(page: Page, creds: OperatorCreds) {
  await page.goto("/org/login");
  await page.waitForURL(/\/auth\/sign-in/);
  await submitOperatorSignIn(page, creds);
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

  if (input.declarationLabel) {
    await selectRadixOption(
      page,
      /assign declaration/i,
      new RegExp(input.declarationLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  } else {
    await page.getByLabel(/assign declaration/i).click();
    const firstOption = page.getByRole("option").first();
    const optionText = await firstOption.textContent();
    if (!optionText?.trim()) {
      throw new Error("No declarations available to assign during client registration");
    }
    await firstOption.click();
  }

  const { issueSubmit, issueSubmitWithEmail } = portalCopy.clientInvite;
  await page
    .getByRole("button", {
      name: new RegExp(`${issueSubmit}|${issueSubmitWithEmail}`, "i"),
    })
    .click();
}

export async function expectClientRegisteredToast(page: Page) {
  const { issued, issuedAndEmailed, issuedEmailFailed } = portalCopy.clientInvite;
  const pattern = new RegExp(
    `(${[issued, issuedAndEmailed, issuedEmailFailed]
      .map((message) => message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "i",
  );
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 15_000 });
}

export async function openDeclarationFromDashboard(page: Page, title: string) {
  await page.goto("/dashboard");
  const link = page.getByRole("link", { name: title, exact: true });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if ((await link.count()) > 0) {
      await link.first().click();
      return;
    }

    const next = page.getByRole("button", { name: /go to next page/i });
    if (!(await next.isEnabled().catch(() => false))) {
      break;
    }
    await next.click();
  }

  throw new Error(`Declaration not found on dashboard: ${title}`);
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
  tab: "manage" | "share" | "submissions",
) {
  const labels = portalCopy.declarationDetail.tabs;
  const pattern =
    tab === "manage"
      ? new RegExp(labels.manage, "i")
      : tab === "share"
        ? new RegExp(labels.share, "i")
        : new RegExp(labels.submissions, "i");
  await page.getByRole("tab", { name: pattern }).first().click();
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
