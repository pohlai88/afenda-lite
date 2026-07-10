import { expect, test } from "@/testing/e2e/playwright-base";
import {
  getOperatorCreds,
  operatorSkipMessage,
  requireOperatorCreds,
} from "@/testing/e2e/credentials";
import { loginAsOperator } from "@/testing/e2e/operator-flows";

const operatorCreds = getOperatorCreds();

test.describe("Trade Hot Sales auth @smoke", () => {
  test("unauthenticated /trade redirects to sign-in", async ({ page }) => {
    await page.goto("/trade/vi/events");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});

test.describe("Trade Hot Sales admin journey @journey", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let eventId: string | undefined;
  let eventName: string | undefined;

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
  });

  test("operator creates event, sets supply, opens window", async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/trade/vi/admin/events/new");
    await expect(
      page.getByRole("heading", { name: /create event|tạo sự kiện/i }),
    ).toBeVisible({ timeout: 20_000 });

    const stamp = Date.now();
    eventName = `E2E Hot Sales ${stamp}`;
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

    await expect(page).toHaveURL(/\/trade\/vi\/admin\/events\/[^/]+\/setup/, {
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

    await page.getByRole("button", { name: /open \/ schedule event/i }).click();
    // "Close event" only renders once the event has actually persisted status=open,
    // so this waits for the open action to complete instead of matching the stale button label.
    await expect(
      page.getByRole("button", { name: /close event/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin places order then runs allocation", async ({ page }) => {
    test.skip(!eventId, "Requires created event");
    await loginAsOperator(page, requireOperatorCreds());

    await page.goto(`/trade/vi/events/${eventId}/order`);
    await page.getByLabel(/customer name/i).fill("E2E Customer");
    await page.locator("#productId").selectOption({ index: 1 });
    await page.getByLabel(/requested quantity/i).fill("25");
    await page.getByRole("button", { name: /submit order/i }).click();
    await expect(page).toHaveURL(/\/my-orders/, { timeout: 20_000 });
    await expect(page.getByText(new RegExp(eventName ?? "E2E Hot Sales"))).toBeVisible();

    await page.goto(`/trade/vi/admin/events/${eventId}/allocation`);
    await page.getByRole("button", { name: /run allocation/i }).click();
    await expect(page.getByText(/full|partial/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("operator can export event summary CSV", async ({ page }) => {
    test.skip(!eventId, "Requires created event");
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/trade/vi/admin/events/${eventId}/setup`);
    await page.getByTestId("trade-export-summary").click();
    await expect(page.getByTestId("trade-export-csv")).toContainText(
      "event_name",
      { timeout: 15_000 },
    );
  });

  test("admin can open Excel imports page for event", async ({ page }) => {
    test.skip(!eventId, "Requires created event");
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto(`/trade/vi/admin/events/${eventId}/imports`);
    await expect(page.getByRole("heading", { name: /excel imports/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel(/import type/i)).toBeVisible();
  });
});
