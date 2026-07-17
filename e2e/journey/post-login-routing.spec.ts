import {
	expectClientHome,
	expectOperatorHome,
	expectWrongRoleForbidden,
} from "@/testing/e2e/assertions";
import {
	resolveClientCredentials,
	resolveOperatorCredentials,
} from "@/testing/e2e/credentials";
import { loginAsClient, loginAsOperator, signIn } from "@/testing/e2e/flows";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * N7 — authenticated post-login routing proof (@journey).
 *
 * Prefer N13 `workerTenant` factory identities; fall back to explicit `E2E_*`
 * env pairs. When neither is available the cases skip with a named reason;
 * seed autofill accounts are never Playwright login subjects.
 *
 * Open-redirect rejection is proven by unit tests on `sanitizeCallbackUrl`
 * plus the AuthUiProvider wiring that forces every post-login navigate through
 * that allowlist. Authenticated cases below prove the end-to-end landing.
 */

test.describe("post-login routing @journey", () => {
	test("operator lands on /admin and signed-in / bounces to /admin", async ({
		page,
		workerTenant,
	}) => {
		const operator = workerTenant?.operator ?? resolveOperatorCredentials();
		test.skip(
			!operator,
			"workerTenant or explicit E2E_OPERATOR_* credentials required",
		);

		await loginAsOperator(page, operator ?? { email: "", password: "" });
		expectOperatorHome(new URL(page.url()).pathname);

		await page.goto("/");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
		expectOperatorHome(new URL(page.url()).pathname);
	});

	test("client lands on /client/dashboard", async ({ page, workerTenant }) => {
		const client = workerTenant?.client ?? resolveClientCredentials();
		test.skip(
			!client,
			"workerTenant or explicit E2E_CLIENT_* credentials required",
		);

		await loginAsClient(page, client ?? { email: "", password: "" });
		expectClientHome(new URL(page.url()).pathname);
	});

	test("authorized deep link returns to its original same-origin path", async ({
		page,
		workerTenant,
	}) => {
		const operator = workerTenant?.operator ?? resolveOperatorCredentials();
		test.skip(
			!operator,
			"workerTenant or explicit E2E_OPERATOR_* credentials required",
		);

		await page.goto("/fft");
		await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
		await signIn(page, operator?.email ?? "", operator?.password ?? "");
		await page.waitForURL(/\/fft(\/|$)/, { timeout: 30_000 });
		expect(new URL(page.url()).pathname).toMatch(/^\/fft/);
	});

	test("external callback is rejected — lands on role home, not external", async ({
		page,
		workerTenant,
	}) => {
		const operator = workerTenant?.operator ?? resolveOperatorCredentials();
		test.skip(
			!operator,
			"workerTenant or explicit E2E_OPERATOR_* credentials required",
		);

		await page.goto("/auth/login?redirectTo=https://example.com/evil");
		await signIn(page, operator?.email ?? "", operator?.password ?? "");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 30_000 });
		expect(page.url()).not.toContain("example.com");
		expectOperatorHome(new URL(page.url()).pathname);
	});

	test("wrong-role shell access stays /403", async ({ page, workerTenant }) => {
		const operator = workerTenant?.operator ?? resolveOperatorCredentials();
		test.skip(
			!operator,
			"workerTenant or explicit E2E_OPERATOR_* credentials required",
		);

		await loginAsOperator(page, operator ?? { email: "", password: "" });
		await expectWrongRoleForbidden(page, "/client/dashboard");
	});
});
