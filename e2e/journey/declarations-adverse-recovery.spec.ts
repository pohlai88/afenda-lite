import { expectClientHome } from "@/testing/e2e/assertions";
import {
	cleanupClientDeclarationFixture,
	type DeclarationFixture,
	seedClientDeclarationFixture,
} from "@/testing/e2e/declaration-fixture";
import { loginAsClient } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * I4 / A7–A9 — invalid · stale/locked · duplicate-safe confirmation (@journey).
 * Concurrent race (A10) and dependency throw (A11) stay unit-layer.
 */

const ADVERSE_ANSWER = "I4 adverse recovery declaration response";

test.describe("declarations adverse recovery @journey", () => {
	let fixture: DeclarationFixture | null = null;

	test.afterEach(async () => {
		if (fixture) {
			await cleanupClientDeclarationFixture(fixture);
			fixture = null;
		}
	});

	test("invalid submit blocked; finalize locks list; detail shows confirmation", async ({
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
		await answer.fill(ADVERSE_ANSWER);

		// A7 — submit stays disabled until a draft is saved.
		const submitInSheet = page.getByRole("button", {
			name: /^Submit declaration$/i,
		});
		await expect(submitInSheet).toBeDisabled();

		await page.getByRole("button", { name: /^Save draft$/i }).click();
		await expect(page.getByText(/Last saved/i)).toBeVisible({
			timeout: 30_000,
		});
		await expect(submitInSheet).toBeEnabled({ timeout: 15_000 });

		await submitInSheet.click();
		await page.waitForURL(
			new RegExp(`/client/declarations/${fixture.assignmentId}(/|$)`),
			{ timeout: 45_000 },
		);

		// A8 — submitted answers locked on detail.
		await expect(
			page.getByText(/Submitted answers are locked for this assignment/i),
		).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(ADVERSE_ANSWER)).toBeVisible();

		// A9 — duplicate-safe recovery read: confirmation code present on detail.
		await expect(page.getByText(/Confirmation code/i)).toBeVisible();
		const confirmation = page.locator("code").filter({ hasText: /.+/ }).first();
		await expect(confirmation).toBeVisible();
		const confirmationCode = (await confirmation.innerText()).trim();
		expect(confirmationCode.length).toBeGreaterThan(0);

		await page.goto("/client/declarations");
		await expect(
			page.getByRole("heading", { name: /^Declarations$/i }),
		).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText(fixture.surveyTitle)).toBeVisible({
			timeout: 15_000,
		});
		// A8 — Respond removed for submitted assignment.
		await expect(page.getByRole("button", { name: /^Respond$/i })).toHaveCount(
			0,
		);

		await page.goto(`/client/declarations/${fixture.assignmentId}`);
		await expect(page.getByText(/Confirmation code/i)).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByText(confirmationCode)).toBeVisible();
	});
});
