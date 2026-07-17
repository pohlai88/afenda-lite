import { expectWrongRoleForbidden } from "@/testing/e2e/assertions";
import { loginAsClient, loginAsOperator } from "@/testing/e2e/flows";
import { test } from "@/testing/e2e/playwright-base";

/**
 * I4 / A2 — wrong-role shell denial (@smoke).
 * Operator must not enter client shells; client must not enter operator admin.
 */
test.describe("wrong-role gate @smoke", () => {
	test("operator on /client/declarations stays /403", async ({
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
		await expectWrongRoleForbidden(page, "/client/declarations");
	});

	test("client on /admin stays /403", async ({ page, workerTenant }) => {
		test.skip(
			!workerTenant,
			"E2E_FACTORY_PASSWORD + DATABASE_URL required for N13 factory",
		);
		if (!workerTenant) {
			return;
		}

		await loginAsClient(page, workerTenant.client);
		await expectWrongRoleForbidden(page, "/admin");
	});
});
