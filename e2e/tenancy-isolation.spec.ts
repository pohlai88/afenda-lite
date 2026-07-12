import { expect, test } from "@/testing/e2e/playwright-base";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/organization-admin-flows";

const operatorCreds = getOperatorCreds();
const foreignSurveyId = process.env.E2E_FOREIGN_SURVEY_ID?.trim();
const foreignUserId = process.env.E2E_FOREIGN_USER_ID?.trim();
const foreignEventId = process.env.E2E_FOREIGN_EVENT_ID?.trim();

/** Stable missing UUID — not present in any tenant. */
const MISSING_UUID = "00000000-0000-4000-8000-000000000099";

test.describe("Multi-tenant isolation @journey", () => {
  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("missing declaration detail is not-found for operator", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/dashboard/${MISSING_UUID}`);
    await expect(page.getByText(/declaration not found/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("missing user detail is not-found for operator", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/dashboard/users/${MISSING_UUID}`);
    await expect(page.getByText(/user not found/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("foreign survey id is not-found when fixture set", async ({ page }) => {
    test.skip(
      !foreignSurveyId,
      "Set E2E_FOREIGN_SURVEY_ID to a survey owned by another org",
    );
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/dashboard/${foreignSurveyId}`);
    await expect(page.getByText(/declaration not found|not found/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("foreign user id is not-found when fixture set", async ({ page }) => {
    test.skip(
      !foreignUserId,
      "Set E2E_FOREIGN_USER_ID to a member of another org",
    );
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/dashboard/users/${foreignUserId}`);
    await expect(page.getByText(/user not found|not found/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("foreign FFT event is not-found when fixture set", async ({ page }) => {
    test.skip(
      !foreignEventId,
      "Set E2E_FOREIGN_EVENT_ID to an event owned by another org",
    );
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/fft/admin/events/${foreignEventId}/setup`);
    await expect(page.getByText(/not found|does not exist|access denied|forbidden/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
