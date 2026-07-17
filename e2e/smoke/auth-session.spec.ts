import { expectOperatorHome } from "@/testing/e2e/assertions";
import { loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * N13 — authenticated session smoke (@smoke).
 * Uses worker-scoped factory identities when `E2E_FACTORY_PASSWORD` + DATABASE_URL
 * are set; otherwise skips with a named reason (never fabricates auth PASS).
 */
test.describe("authenticated session @smoke", () => {
	test("factory operator signs in to operator home", async ({
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

		await loginAsOperator(page, workerTenant.operator);
		expectOperatorHome(new URL(page.url()).pathname);
		await expect(page).toHaveURL(/\/admin(\/|$)/);
	});
});
