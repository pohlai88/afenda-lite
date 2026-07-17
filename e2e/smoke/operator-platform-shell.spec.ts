import { expectOperatorShellNav } from "@/testing/e2e/assertions";
import { loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";
import {
	assignLimitedOperatorNavRole,
	clearOperatorPlatformAssignments,
} from "@/testing/e2e/tenancy";

/**
 * N16 Path-to-100% — authenticated operator platform shell nav (@smoke).
 * Case A: admin bootstrap → both module links.
 * Case B: editor assignment (clients.invite, no fft.access) → FFT link hidden.
 * Serial: shared workerTenant assignment state must not leak across cases.
 */
test.describe("operator platform shell @smoke", () => {
	test.describe.configure({ mode: "serial" });

	test("admin bootstrap shows Operator admin and Feed Farm Trade nav", async ({
		page,
		workerTenant,
	}) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for N13 factory",
		);
		if (!workerTenant) {
			return;
		}

		await clearOperatorPlatformAssignments(workerTenant);
		await loginAsOperator(page, workerTenant.operator);
		await expectOperatorShellNav(page, { admin: true, fft: true });

		await page
			.locator('a[href="/fft"]')
			.filter({ hasText: /Feed Farm Trade/i })
			.first()
			.click();
		await page.waitForURL(/\/fft(\/|$)/, { timeout: 15_000 });
		await expectOperatorShellNav(page, { admin: true, fft: true });
	});

	test("limited assignment hides Feed Farm Trade nav without fft.access", async ({
		page,
		workerTenant,
	}) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for N13 factory",
		);
		if (!workerTenant) {
			return;
		}

		await assignLimitedOperatorNavRole(workerTenant);
		await loginAsOperator(page, workerTenant.operator);
		await expectOperatorShellNav(page, { admin: true, fft: false });
	});
});
