import { expect, test } from "@/testing/e2e/playwright-base";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/organization-admin-flows";
import { ensureTradeAllowlistForOperator } from "@/testing/e2e/fft-allowlist";

const operatorCreds = getOperatorCreds();
const eventId = process.env.PLAYGROUND_FFT_EVENT_ID;
const localOpsEnabled = [
  "FFT_DEPOSIT_ENABLED",
  "FFT_PICKUP_OPS_ENABLED",
  "FFT_NOTIFICATIONS_ENABLED",
  "FFT_ERP_SYNC_ENABLED",
].every((key) => process.env[key] === "true");

test.describe("Feed Farm Trade local ops @journey", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.beforeAll(async () => {
    test.skip(!operatorCreds, operatorSkipMessage);
    test.skip(!eventId, "PLAYGROUND_FFT_EVENT_ID is required");
    test.skip(!localOpsEnabled, "All local P3 ops flags must be true");
    if (operatorCreds) {
      await ensureTradeAllowlistForOperator(operatorCreds);
    }
  });

  test("admin sees real ops panels and setup navigation", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());

    await page.goto(`/fft/admin/events/${eventId}/setup`);
    await expect(page).toHaveURL(
      new RegExp(`/fft/admin/events/${eventId}/setup`),
    );
    await expect(
      page.locator(`a[href="/fft/admin/events/${eventId}/imports"]`),
    ).toBeVisible();
    await expect(
      page.locator(`a[href="/fft/admin/events/${eventId}/deposits"]`),
    ).toBeVisible();
    await expect(
      page.locator(`a[href="/fft/admin/events/${eventId}/pickup"]`),
    ).toBeVisible();
    await expect(page.locator('a[href="/fft/admin/erp-sync"]')).toBeVisible();

    await page.goto(`/fft/admin/events/${eventId}/deposits`);
    await expect(
      page.getByRole("heading", {
        name: /Deposits \(operational\)|Tiền cọc \(vận hành\)/,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Ops handoff lane/)).toHaveCount(0);

    await page.goto(`/fft/admin/events/${eventId}/pickup`);
    await expect(
      page.getByRole("heading", {
        name: /Pickup windows|Khung giờ lấy hàng/,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Ops handoff lane/)).toHaveCount(0);

    await page.goto(`/fft/admin/events/${eventId}/imports`);
    await expect(
      page.getByRole("button", { name: "Download template" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Deposit records" })).toBeEnabled();
    await expect(
      page.getByRole("option", { name: "Pickup confirmation" }),
    ).toBeEnabled();

    await page.goto("/fft/admin/erp-sync");
    await expect(
      page.getByRole("button", { name: "Process pending jobs" }),
    ).toBeVisible();
    await expect(page.getByText(/Ops handoff lane/)).toHaveCount(0);
  });
});
