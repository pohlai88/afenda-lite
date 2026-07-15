import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * Minimal @smoke gate that the Playwright factory boots.
 * Product auth spine (P1–P6) belongs in later journey specs — not here.
 */
test.describe("factory boot @smoke", () => {
	test("app origin responds", async ({ page }) => {
		const response = await page.goto("/");
		expect(response).not.toBeNull();
		const status = response?.status() ?? 0;
		expect(status).toBeGreaterThanOrEqual(200);
		expect(status).toBeLessThan(500);
	});
});
