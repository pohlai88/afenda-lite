import { expectWrongRoleForbidden } from "@/testing/e2e/assertions";
import { loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";
import {
	assignLimitedOperatorNavRole,
	clearOperatorPlatformAssignments,
} from "@/testing/e2e/tenancy";

/**
 * N18 Path-to-100% — authenticated FFT freeze read shell (@smoke).
 * Case A: admin bootstrap → `/fft` events shell visible.
 * Case B: editor (no fft.access) → `/fft` → `/403`.
 * Serial: shared workerTenant assignment state must not leak across cases.
 */
test.describe("FFT permitted vertical @smoke", () => {
	test.describe.configure({ mode: "serial" });

	test("entitled operator sees Feed Farm Trade events shell on /fft", async ({
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
		await page.goto("/fft");
		await page.waitForURL(/\/fft(\/|$)/, { timeout: 15_000 });
		expect(new URL(page.url()).pathname).toMatch(/^\/fft/);
		await expect(
			page.getByRole("heading", { name: "Feed Farm Trade", level: 1 }),
		).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Events", { exact: true }).first()).toBeVisible({
			timeout: 15_000,
		});
	});

	test("operator without fft.access is forbidden on /fft", async ({
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
		await expectWrongRoleForbidden(page, "/fft");
	});
});
