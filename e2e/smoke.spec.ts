import { expect, test } from "@playwright/test";
import { portalCopy } from "../lib/portal-copy";
import {
  createDeclaration,
  getOperatorCreds,
  loginAsOperator,
  operatorSkipMessage,
  requireOperatorCreds,
} from "./helpers/operator";

const operatorCreds = getOperatorCreds();
const publicSurveySlug = process.env.E2E_SURVEY_SLUG;

test.describe("Portal smoke", () => {
  test("liveness endpoint returns alive", async ({ request }) => {
    const response = await request.get("/api/health/liveness");
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
    const response = await request.get("/api/health/readiness");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toHaveProperty("status");
    expect(["ready", "degraded"]).toContain(body.data.status);
  });

  test("client portal home renders sign in", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /organization sign in/i }),
    ).toBeVisible();
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
});

test.describe("Operator and protected declaration routes", () => {
  test.describe.configure({ mode: "serial" });

  let createdSurveySlug: string | undefined;

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
    createdSurveySlug = created.slug;
    expect(createdSurveySlug).toBeTruthy();
  });

  test("legacy public survey route redirects to client sign in", async ({
    page,
  }) => {
    const slug = createdSurveySlug ?? publicSurveySlug;
    test.skip(!slug, "Requires operator create flow or E2E_SURVEY_SLUG");

    await page.goto(`/survey/${slug}`);
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(
      page.getByRole("link", { name: /organization sign in/i }),
    ).toBeVisible();
  });
});

test.describe("Client invite path", () => {
  test("legacy invite token redirects to client sign in", async ({ page }) => {
    await page.goto("/invite/not-a-valid-token");
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });
});
