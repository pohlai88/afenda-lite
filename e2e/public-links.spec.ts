import { expect, test } from "@/testing/e2e/playwright-base";
import { SANDBOX_INVITE_TOKEN, SANDBOX_SURVEY_SLUG } from "@/lib/production-fixtures";
import { portalCopy } from "@/lib/portal-copy";
import {
  clientSkipMessage,
  getClientCreds,
  getOperatorCreds,
  operatorSkipMessage,
  requireClientCreds,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsClient } from "@/testing/e2e/client-flows";
import {
  loginAsOperator,
  openSurveyTab,
} from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();
const clientCreds = getClientCreds();
const publicSurveySlug = process.env.E2E_SURVEY_SLUG ?? SANDBOX_SURVEY_SLUG;
const publicSecureToken = process.env.E2E_INVITE_TOKEN ?? SANDBOX_INVITE_TOKEN;

test.describe("Public declaration links @smoke", () => {
  test("invalid secure link returns not found", async ({ page }) => {
    const response = await page.goto("/f/not-a-valid-token");
    expect(response?.status()).toBe(404);
  });

  test("invalid open link returns not found", async ({ page }) => {
    const response = await page.goto("/survey/not-a-real-slug-xyz");
    expect(response?.status()).toBe(404);
  });

  test("secure link redirects unauthenticated users to sign in with return path", async ({
    page,
  }) => {
    await page.goto(`/f/${publicSecureToken}`);
    await expect(page).toHaveURL(/\/auth\/sign-in\?.*reason=login-required/);
    await expect(page).toHaveURL(/returnTo=%2Ff%2F/);
    await expect(
      page.getByText(new RegExp(portalCopy.signIn.loginRequiredHint, "i")),
    ).toBeVisible();
  });

  test("open link redirects unauthenticated users to sign in with return path", async ({
    page,
  }) => {
    await page.goto(`/survey/${publicSurveySlug}`);
    await expect(page).toHaveURL(/\/auth\/sign-in\?.*reason=login-required/);
    await expect(page).toHaveURL(/returnTo=%2Fsurvey%2F/);
    await expect(
      page.getByText(new RegExp(portalCopy.signIn.loginRequiredHint, "i")),
    ).toBeVisible();
  });
});

test.describe("Authenticated public link routing @journey", () => {
  test.beforeEach(() => {
    test.skip(!clientCreds, clientSkipMessage);
  });

  test("open link sign-in with returnTo routes assigned client to declare page", async ({
    page,
  }) => {
    await page.goto(`/survey/${publicSurveySlug}`);
    await expect(page).toHaveURL(/\/auth\/sign-in\?.*returnTo=/);

    const creds = requireClientCreds();
    await page.getByLabel(/^email$/i).fill(creds.email);
    await page.locator('input[name="password"]').fill(creds.password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/client\/declare\/.+/, { timeout: 20_000 });
  });

  test("signed-in client visiting open link routes directly to declare page", async ({
    page,
  }) => {
    const creds = requireClientCreds();
    await page.goto("/auth/sign-in");
    await page.getByLabel(/^email$/i).fill(creds.email);
    await page.locator('input[name="password"]').fill(creds.password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/client(?:\/|$)/);

    await page.goto(`/survey/${publicSurveySlug}`);
    await expect(page).toHaveURL(/\/client\/declare\/.+/);
  });
});

test.describe("Operator share surfaces @journey", () => {
  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("share tab shows secure and open declaration links", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /sandbox operator preview declaration/i }).click();
    await openSurveyTab(page, "share");

    await expect(page.getByText(portalCopy.share.secureLinkLabel)).toBeVisible();
    await expect(page.locator(".portal-code-block").filter({ hasText: /\/f\// })).toBeVisible();
    await expect(page.getByText(portalCopy.share.openLinkLabel)).toBeVisible();
    await expect(
      page.locator(".portal-code-block").filter({ hasText: /\/survey\// }),
    ).toBeVisible();
  });

  test("operator can rotate secure link token", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /sandbox operator preview declaration/i }).click();
    await openSurveyTab(page, "share");

    const secureLink = page.locator(".portal-code-block").filter({ hasText: /\/f\// });
    const originalHref = await secureLink.textContent();
    expect(originalHref).toMatch(/\/f\//);

    const originalToken = originalHref?.match(/\/f\/([^/\s]+)/)?.[1];
    expect(originalToken).toBeTruthy();

    await page.getByRole("button", { name: portalCopy.share.rotateSecureLinkCta }).click();
    await page.getByRole("button", { name: portalCopy.share.rotateSecureLinkSubmit }).click();

    await expect(secureLink).not.toHaveText(originalHref ?? "", { timeout: 10_000 });
    await expect(secureLink).toHaveText(/\/f\//);

    const staleResponse = await page.goto(`/f/${originalToken}`);
    expect(staleResponse?.status()).toBe(404);
  });
});
