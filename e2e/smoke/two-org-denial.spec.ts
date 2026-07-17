import { loginAsOperator } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";
import { assertCrossTenantDenied } from "@/testing/e2e/tenancy";

/**
 * N13 — two-org denial smoke (@smoke).
 * Proves actor in orgA has no membership in orgB (SQL) and browser session
 * for orgA owner stays on the operator shell (not foreign-org context).
 */
test.describe("two-org denial @smoke", () => {
	test("orgA operator has no orgB membership; session stays on /admin", async ({
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

		await assertCrossTenantDenied({
			actorUserId: tenant.operator.userId,
			foreignOrgId: tenant.orgB.id,
		});
		await assertCrossTenantDenied({
			actorUserId: tenant.client.userId,
			foreignOrgId: tenant.orgB.id,
		});

		await loginAsOperator(page, tenant.operator);
		expect(new URL(page.url()).pathname).toMatch(/^\/admin/);
		expect(page.url()).not.toContain(tenant.orgB.slug);
	});
});
