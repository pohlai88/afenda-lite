import { expect } from "@playwright/test";

import { A11Y_ASSISTIVE_MATRIX } from "@/testing/a11y-assistive-matrix";
import {
	expectNoAxeViolations,
	expectSkipLinkFocusOwnership,
} from "@/testing/e2e/a11y";
import { loginAsClient, loginAsOperator } from "@/testing/e2e/flows";
import { test } from "@/testing/e2e/playwright-base";

/**
 * I5.4 A11Y03 — axe + skip-link / focus ownership on in-scope journeys (@smoke).
 */
test.describe("a11y assistive matrix @smoke", () => {
	for (const row of A11Y_ASSISTIVE_MATRIX) {
		test(`${row.id} ${row.path}`, async ({ page, workerTenant }) => {
			if (row.auth !== "none") {
				test.skip(
					!workerTenant,
					"E2E factory incomplete — authenticated a11y row skipped (named; not PASS)",
				);
				if (!workerTenant) {
					return;
				}
				if (row.auth === "operator") {
					await loginAsOperator(page, workerTenant.operator);
				} else {
					await loginAsClient(page, workerTenant.client);
				}
			}

			// PL-S12 — public shells must remain usable at narrow viewports.
			if (row.auth === "none") {
				await page.setViewportSize({ width: 320, height: 568 });
			}

			await page.goto(row.path, { waitUntil: "domcontentloaded" });
			if (row.checks.includes("skip-link")) {
				await expectSkipLinkFocusOwnership(page);
			}
			if (row.auth === "none") {
				await expect(page.locator("#main-content")).toBeVisible();
			}
			if (row.checks.includes("axe")) {
				await expectNoAxeViolations(page);
			}
		});
	}
});
