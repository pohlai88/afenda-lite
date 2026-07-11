import { expect, test } from "@/testing/e2e/playwright-base";
import {
  HEALTH_LIVENESS_API_HREF,
  HEALTH_READINESS_API_HREF,
} from "@/modules/platform/api/routes";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import {
  createDeclaration,
  deleteDeclarationFromDashboard,
  expectDeclarationListed,
  loginAsOperator,
} from "@/testing/e2e/organization-admin-flows";

const operatorCreds = getOperatorCreds();

test.describe("Portal smoke @smoke", () => {
  test("liveness endpoint returns alive", async ({ request }) => {
    const response = await request.get(HEALTH_LIVENESS_API_HREF);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toEqual(
      expect.objectContaining({
        status: "alive",
        timestamp: expect.any(String),
      }),
    );
  });

  test("readiness endpoint returns JSON", async ({ request }) => {
    const response = await request.get(HEALTH_READINESS_API_HREF);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toHaveProperty("status");
    expect(["ready", "degraded"]).toContain(body.data.status);
  });

  test("legacy auth admin alias opens organization sign in", async ({ page }) => {
    await page.goto("/auth/admin");
    await expect(page).toHaveURL(/\/auth\/sign-in\?.*from=org/);
    await expect(
      page.getByRole("heading", { name: /organization sign in/i }),
    ).toBeVisible();
  });

  test("legacy auth admin preserves access denied reason", async ({ page }) => {
    await page.goto("/auth/admin?reason=access-denied");
    await expect(page).toHaveURL(/\/auth\/sign-in\?.*from=org.*reason=access-denied/);
    await expect(
      page.getByText(portalCopy.accessDenied.title),
    ).toBeVisible();
  });

  test("client portal home unlocks Neon auth entries", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);

    await page
      .getByRole("button", { name: /unlock authentication options/i })
      .click();

    await expect(page.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      /\/auth\/sign-in/,
    );
    await expect(
      page.getByRole("link", { name: /^create account$/i }),
    ).toHaveAttribute("href", /\/auth\/sign-up/);
  });

  test("organization login page renders", async ({ page }) => {
    await page.goto("/org/login");
    await expect(
      page.getByRole("heading", { name: /organization sign in/i }),
    ).toBeVisible();
  });

  test("access denied message on org login", async ({ page }) => {
    await page.goto("/org/login?reason=access-denied");
    await expect(
      page.getByText(portalCopy.accessDenied.title),
    ).toBeVisible();
  });

  test("trade routes require authentication", async ({ page }) => {
    await page.goto("/fft/events");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("preview unavailable gate renders in playground embed", async ({ page }) => {
    await page.goto("/client/preview-unavailable?embed=1");
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);

    if (page.url().includes("/client/preview-unavailable")) {
      await expect(
        page.getByText(portalCopy.previewClient.notConfiguredTitle),
      ).toBeVisible();
      await expect(
        page.getByText(portalCopy.previewClient.notConfigured, { exact: false }),
      ).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/client(?:\?embed=1|$)/);
  });
});

test.describe("Operator declaration routes @journey", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let createdDeclarationTitle: string | undefined;

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("operator creates a declaration", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    const created = await createDeclaration(
      page,
      `E2E declaration ${Date.now()}`,
    );
    await expect(page.getByRole("heading", { name: created.title })).toBeVisible();
    createdDeclarationTitle = created.title;
    expect(created.slug).toBeTruthy();
  });

  test("dashboard lists created declaration", async ({ page }) => {
    test.skip(!createdDeclarationTitle, "Requires operator create flow");

    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/dashboard");
    await expectDeclarationListed(page, createdDeclarationTitle!);
  });

  test("operator delete removes declaration from dashboard list", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    const title = `E2E delete ${Date.now()}`;
    await createDeclaration(page, title);
    await page.goto("/dashboard");
    await expectDeclarationListed(page, title);
    await deleteDeclarationFromDashboard(page, title);
  });
});

/** S6 legacy client invitation URL — separate from S5 `/f/[token]` in `e2e/public-links.spec.ts`. */
test.describe("Client invite path @smoke", () => {
  test("legacy invite token redirects to client sign in with reason", async ({
    page,
  }) => {
    await page.goto("/invite/not-a-valid-token");
    await expect(page).toHaveURL(/\/auth\/sign-in\?reason=invite-invalid/);
    await expect(
      page.getByText(new RegExp(portalCopy.signIn.inviteInvalidHint, "i")),
    ).toBeVisible();
  });
});
