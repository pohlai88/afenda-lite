import { expectClientHome } from "@/testing/e2e/assertions";
import {
	cleanupClientDeclarationFixture,
	type DeclarationFixture,
	seedClientDeclarationFixture,
} from "@/testing/e2e/declaration-fixture";
import { loginAsClient } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * N17 — authenticated declarations list → draft → submit → confirmation read.
 * Requires N13 worker factory (`E2E_FACTORY_PASSWORD` + `DATABASE_URL`).
 */

test.describe("declarations submit/read @journey", () => {
	let fixture: DeclarationFixture | null = null;

	test.afterEach(async () => {
		if (fixture) {
			await cleanupClientDeclarationFixture(fixture);
			fixture = null;
		}
	});

	test("client list → draft → submit → confirmation on detail", async ({
		page,
		workerTenant,
	}) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for N13 factory",
		);

		const tenant = workerTenant;
		if (!tenant) {
			return;
		}

		fixture = await seedClientDeclarationFixture(tenant);

		await loginAsClient(page, tenant.client);
		expectClientHome(new URL(page.url()).pathname);

		await expect(
			page.getByRole("heading", { name: /^Declarations$/i }),
		).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(fixture.surveyTitle)).toBeVisible({
			timeout: 15_000,
		});

		await page.getByRole("button", { name: /^Respond$/i }).first().click();
		const answer = page.getByLabel(/your response/i);
		await expect(answer).toBeVisible({ timeout: 15_000 });
		await answer.fill("N17 Path-to-100% declaration response");

		await page.getByRole("button", { name: /^Save draft$/i }).click();
		await expect(page.getByText(/Last saved/i)).toBeVisible({
			timeout: 30_000,
		});

		await page.getByRole("button", { name: /^Submit declaration$/i }).click();
		await page.waitForURL(
			new RegExp(`/client/declarations/${fixture.assignmentId}(/|$)`),
			{ timeout: 45_000 },
		);

		await expect(page.getByText(/Confirmation/i).first()).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByText(/submitted/i).first()).toBeVisible();
		await expect(
			page.getByText("N17 Path-to-100% declaration response"),
		).toBeVisible();
	});
});
