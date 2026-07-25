import {
	resolveClientCredentials,
	resolveOperatorCredentials,
} from "@/testing/e2e/credentials";
import { loginAsClient, loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * CA-2 — authenticated operator/client governance and premises journey (@journey).
 *
 * Operator: open Corporate Administration, reach Governance tab controls when a
 * company is selected. Client: same route read-only (no governance manage accordion).
 */

test.describe("corporate administration governance @journey", () => {
	test("operator reaches governance controls on admin corporate administration", async ({
		page,
		workerTenant,
	}) => {
		const operator = workerTenant?.operator ?? resolveOperatorCredentials();
		test.skip(
			!operator,
			"workerTenant or explicit E2E_OPERATOR_* credentials required",
		);

		await loginAsOperator(page, operator ?? { email: "", password: "" });
		await page.goto("/admin/corporate-administration");
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByRole("heading", { name: /corporate administration/i }),
		).toBeVisible({ timeout: 15_000 });

		const openCompany = page.getByRole("link", { name: /^Open /i }).first();
		if (await openCompany.isVisible().catch(() => false)) {
			await openCompany.click();
			await page.waitForURL(/companyId=/, { timeout: 15_000 });
			await page.getByRole("tab", { name: "Governance" }).click();
			await expect(
				page.getByRole("heading", { name: "Governance register" }),
			).toBeVisible({ timeout: 15_000 });
			await expect(
				page.getByText("Governance controls", { exact: false }),
			).toBeVisible();
		} else {
			await expect(
				page.getByText("No legal companies yet", { exact: false }),
			).toBeVisible();
		}
	});

	test("client sees governance register read-only without manage controls", async ({
		page,
		workerTenant,
	}) => {
		const client = workerTenant?.client ?? resolveClientCredentials();
		test.skip(
			!client,
			"workerTenant or explicit E2E_CLIENT_* credentials required",
		);

		await loginAsClient(page, client ?? { email: "", password: "" });
		await page.goto("/client/corporate-administration");
		await page.waitForLoadState("networkidle");

		await expect(
			page.getByRole("heading", { name: /corporate administration/i }),
		).toBeVisible({ timeout: 15_000 });

		const openCompany = page.getByRole("link", { name: /^Open /i }).first();
		if (await openCompany.isVisible().catch(() => false)) {
			await openCompany.click();
			await page.waitForURL(/companyId=/, { timeout: 15_000 });
			await page.getByRole("tab", { name: "Governance" }).click();
			await expect(
				page.getByRole("heading", { name: "Governance register" }),
			).toBeVisible({ timeout: 15_000 });
			await expect(page.getByText("Governance controls")).toHaveCount(0);
		}
	});
});
