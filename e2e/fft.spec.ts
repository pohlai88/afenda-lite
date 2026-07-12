import { expect, test } from "@/testing/e2e/playwright-base";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/organization-admin-flows";
import { ensureTradeAllowlistForOperator } from "@/testing/e2e/fft-allowlist";

const operatorCreds = getOperatorCreds();

test.describe("Trade Feed Farm Trade auth @smoke", () => {
  test("unauthenticated /fft redirects to sign-in", async ({ page }) => {
    await page.goto("/fft/events");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});

/**
 * Enterprise MVP journey (P1 / G1–G8).
 * Locators use data-testid / data-status only — no fragile text scraping.
 */
test.describe("Feed Farm Trade core cycle @journey", () => {
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  let eventId: string | undefined;
  let eventName: string | undefined;
  let customerName: string | undefined;
  let transferName: string | undefined;
  let clonedEventId: string | undefined;

  test.beforeAll(async () => {
    test.skip(!operatorCreds, operatorSkipMessage);
    if (operatorCreds) {
      await ensureTradeAllowlistForOperator(operatorCreds);
    }
  });

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("operator sets up event: supply, priority, fields, open (G1/G2/G5)", async ({
    page,
  }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/fft/admin/events/new");
    await expect(page).toHaveURL(/\/trade\/admin\/events\/new/, {
      timeout: 20_000,
    });
    await expect(page.getByLabel(/event name/i)).toBeVisible({
      timeout: 20_000,
    });

    const stamp = Date.now();
    eventName = `E2E FFT ${stamp}`;
    customerName = `E2E Customer ${stamp}`;
    transferName = `E2E Transfer ${stamp}`;
    await page.getByLabel(/event name/i).fill(eventName);

    const opens = new Date(Date.now() - 60_000);
    const closes = new Date(Date.now() + 60 * 60_000);
    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    await page.locator("#opensAt").fill(toLocal(opens));
    await page.locator("#closesAt").fill(toLocal(closes));
    await page.getByRole("button", { name: /create event/i }).click();

    await expect(page).toHaveURL(/\/trade\/admin\/events\/[^/]+\/setup/, {
      timeout: 30_000,
    });
    eventId = page.url().match(/events\/([^/]+)\/setup/)?.[1];
    expect(eventId).toBeTruthy();

    await page.getByPlaceholder("Product name").last().fill("E2E SKU");
    await page.getByPlaceholder("Final confirmed qty").last().fill("100");
    await page.getByRole("button", { name: /add product/i }).click();
    await expect(page.getByPlaceholder("Product name").first()).toHaveValue(
      "E2E SKU",
      { timeout: 15_000 },
    );

    await page.getByPlaceholder("field_key").last().fill("farm_code");
    await page.getByPlaceholder("Label EN").last().fill("Farm code");
    await page.getByPlaceholder("Label VI").last().fill("Ma trai");
    await page.getByRole("button", { name: /add column/i }).click();
    await expect(page.getByPlaceholder("field_key").first()).toHaveValue(
      "farm_code",
      { timeout: 15_000 },
    );

    await page.locator("#csv").fill(
      `customer_name,customer_code,priority_rank,priority_group\n${customerName},C-E2E,1,P1\n`,
    );
    await page.getByRole("button", { name: /import priority csv/i }).click();
    await expect(page.getByText(`#1 ${customerName}`)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /open \/ schedule event/i }).click();
    await expect(
      page.getByRole("button", { name: /close event/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("order → allocate → transfer → complete (G3/G4)", async ({ page }) => {
    test.skip(!eventId || !customerName || !transferName, "Requires created event");
    await loginAsOperator(page, requireOperatorCreds());

    await page.goto(`/fft/events/${eventId}/order`);
    await page.getByTestId("fft-order-customer-name").fill(customerName!);
    await page.getByTestId("fft-order-product").selectOption({ index: 1 });
    await page.getByTestId("fft-order-qty").fill("25");
    const farmAttr = page.getByTestId("fft-order-attr-farm_code");
    if (await farmAttr.count()) {
      await farmAttr.fill("FARM-E2E");
    }
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          Boolean(res.request().headers()["next-action"]),
        { timeout: 30_000 },
      ),
      page.getByTestId("fft-order-submit").click(),
    ]);
    await expect(page.getByTestId("fft-order-error")).toHaveCount(0);
    await expect(page).toHaveURL(/\/my-orders/, { timeout: 20_000 });
    await expect(
      page.locator(`[data-testid="fft-my-order-row"][data-customer="${customerName}"]`),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto(`/fft/admin/events/${eventId}/allocation`);
    const runBtn = page.getByTestId("fft-run-allocation");
    await runBtn.click();
    // Wait for Server Action to finish (button re-enables) before asserting RSC props.
    await expect(runBtn).toBeEnabled({ timeout: 30_000 });
    await expect(
      page.locator(
        `[data-testid="fft-order-row"][data-customer="${customerName}"][data-status="full"], [data-testid="fft-order-row"][data-customer="${customerName}"][data-status="partial"]`,
      ),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto("/fft/my-orders");
    const orderCard = page.locator(
      `[data-testid="fft-my-order-row"][data-customer="${customerName}"]`,
    );
    await expect(orderCard).toHaveAttribute("data-status", /full|partial/, {
      timeout: 15_000,
    });
    await orderCard.getByTestId("fft-transfer-new-customer").fill(transferName!);
    await orderCard.getByTestId("fft-transfer-reason").fill("E2E transfer");
    await orderCard.getByTestId("fft-transfer-qty").fill("25");
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.request().method() === "POST" &&
          (res.url().includes(eventId!) ||
            Boolean(res.request().headers()["next-action"])),
        { timeout: 30_000 },
      ),
      orderCard.getByTestId("fft-transfer-request").click(),
    ]);

    await page.goto(`/fft/admin/events/${eventId}/allocation`);
    const transferSection = page.getByTestId("fft-transfer-requests");
    await expect(transferSection).toContainText(transferName!, { timeout: 30_000 });
    await transferSection.getByTestId("fft-transfer-approve").click();
    await expect(transferSection.getByText(/approved/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const allocatedRow = page.locator(
      `[data-testid="fft-order-row"][data-customer="${transferName}"]`,
    );
    await expect(allocatedRow).toBeVisible({ timeout: 20_000 });
    await allocatedRow.getByPlaceholder("Fulfilled qty").fill("25");
    await allocatedRow.getByTestId("fft-complete-order").click();
    await expect(
      page.locator(
        `[data-testid="fft-order-row"][data-customer="${transferName}"][data-status="completed"]`,
      ),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("audit + export + clone (G6/G7/G8)", async ({ page }) => {
    test.skip(!eventId, "Requires created event");
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/fft/admin/events/${eventId}/setup`);

    await expect(page.getByRole("heading", { name: /^audit$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/event\.created|priority\.imported|order\.completed|allocation\.run/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("fft-export-summary").click();
    await expect(page.getByTestId("fft-export-csv")).toContainText(
      "event_name",
      { timeout: 15_000 },
    );

    const sourceEventId = eventId!;
    await page.getByTestId("fft-clone-event").click();
    await expect(page).toHaveURL(
      new RegExp(`/fft/admin/events/(?!${sourceEventId})[^/]+/setup`),
      { timeout: 30_000 },
    );
    clonedEventId = page.url().match(/events\/([^/]+)\/setup/)?.[1];
    expect(clonedEventId).toBeTruthy();
    expect(clonedEventId).not.toBe(sourceEventId);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Copy/i, {
      timeout: 15_000,
    });
  });
});
