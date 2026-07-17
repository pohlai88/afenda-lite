import { expectAnonymousRedirectToLogin } from "@/testing/e2e/assertions";
import { test } from "@/testing/e2e/playwright-base";

/**
 * N14 — anonymous denial smoke (@smoke).
 * Unauthenticated visits to matcher-protected shells must land on `/auth/login`.
 * Does not require E2E factory credentials.
 */
test.describe("anonymous gate @smoke", () => {
	for (const protectedPath of [
		"/admin",
		"/fft",
		"/client/declarations",
		"/client/dashboard",
		"/dashboard",
	] as const) {
		test(`anonymous ${protectedPath} redirects to /auth/login`, async ({
			page,
		}) => {
			await expectAnonymousRedirectToLogin(page, protectedPath);
		});
	}
});
