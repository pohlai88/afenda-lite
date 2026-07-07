import { expect, test } from "@playwright/test";
import { portalCopy } from "../lib/portal-copy";
import {
  createDeclaration,
  getOperatorCreds,
  loginAsOperator,
  operatorSkipMessage,
  requireOperatorCreds,
} from "./helpers/operator";
import {
  expectDeclarationReceived,
  submitDefaultDeclarationAnswers,
} from "./helpers/declaration";

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

test.describe("Operator and public flows", () => {
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
    createdSurveySlug = created.publicSlug;
    expect(createdSurveySlug).toBeTruthy();
  });

  test("public declaration page loads from created link", async ({ page }) => {
    const slug = createdSurveySlug ?? publicSurveySlug;
    test.skip(!slug, "Requires operator create flow or E2E_SURVEY_SLUG");

    await page.goto(`/survey/${slug}`);
    await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
  });

  test("public declaration accepts yes/no and text answers", async ({
    page,
  }) => {
    const slug = createdSurveySlug ?? publicSurveySlug;
    test.skip(!slug, "Requires operator create flow or E2E_SURVEY_SLUG");

    await page.goto(`/survey/${slug}`);
    await submitDefaultDeclarationAnswers(
      page,
      "E2E public open-link submission",
    );
    await expectDeclarationReceived(page);
  });
});

test.describe("Client invite path", () => {
  test("invalid invite token shows error state", async ({ page }) => {
    await page.goto("/invite/not-a-valid-token");
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
