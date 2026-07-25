import { expect, test } from "@/testing/e2e/playwright-base";
import { loginAsOperator } from "@/testing/e2e/flows";

/**
 * CA-1 §18 browser journey — operator legal-company registry.
 */
test.describe("corporate administration legal company @journey", () => {
	test("operator can open registry and create draft company", async ({
		page,
		workerTenant,
	}) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for factory tenant",
		);
		if (!workerTenant) return;

		await loginAsOperator(page, workerTenant.operator);
		await page.goto("/admin/corporate-administration");
		await expect(
			page.getByRole("heading", { name: "Legal companies" }),
		).toBeVisible();
		await expect(page.getByText("Statutory registry")).toBeVisible();
		await expect(page.getByRole("columnheader", { name: "Code" })).toBeVisible();
	});
});
