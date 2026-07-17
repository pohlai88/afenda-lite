import { expectClientHome } from "@/testing/e2e/assertions";
import {
	cleanupClientDeclarationFixture,
	type DeclarationFixture,
	seedClientDeclarationFixture,
} from "@/testing/e2e/declaration-fixture";
import { loginAsClient } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * I4 / A6 — write recovery (@journey).
 * Save draft → close sheet → reopen → restored answer → submit → confirmation.
 */

const RECOVERY_ANSWER = "I4 draft recovery declaration response";

test.describe("declarations draft recovery @journey", () => {
	let fixture: DeclarationFixture | null = null;

	test.afterEach(async () => {
		if (fixture) {
			await cleanupClientDeclarationFixture(fixture);
			fixture = null;
		}
	});

	test("draft survives close/reopen then submits", async ({
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

		await page
			.getByRole("button", { name: /^Respond$/i })
			.first()
			.click();
		const answer = page.getByLabel(/your response/i);
		await expect(answer).toBeVisible({ timeout: 15_000 });
		await answer.fill(RECOVERY_ANSWER);

		await page.getByRole("button", { name: /^Save draft$/i }).click();
		await expect(page.getByText(/Last saved/i)).toBeVisible({
			timeout: 30_000,
		});

		// SheetFooter "Close" (outline) — not the sheet chrome dismiss control.
		await page
			.locator('[data-slot="button"][data-variant="outline"]')
			.filter({ hasText: /^Close$/i })
			.click();
		await expect(answer).toBeHidden({ timeout: 15_000 });

		await page
			.getByRole("button", { name: /^Respond$/i })
			.first()
			.click();
		await expect(answer).toBeVisible({ timeout: 15_000 });
		await expect(answer).toHaveValue(RECOVERY_ANSWER);
		await expect(page.getByText(/Last saved/i)).toBeVisible({
			timeout: 15_000,
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
		await expect(page.getByText(RECOVERY_ANSWER)).toBeVisible();
	});
});
