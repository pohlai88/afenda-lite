import { expectOperatorShellNav } from "@/testing/e2e/assertions";
import { loginAsOperator } from "@/testing/e2e/flows";
import { test } from "@/testing/e2e/playwright-base";
import { clearOperatorPlatformAssignments } from "@/testing/e2e/tenancy";

/**
 * N16 — authenticated operator platform shell nav (@smoke).
 * Admin bootstrap → Operator admin link visible on `/admin`.
 */
test.describe("operator platform shell @smoke", () => {
	test("admin bootstrap shows Operator admin nav", async ({
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
		await expectOperatorShellNav(page, { admin: true });
	});
});
