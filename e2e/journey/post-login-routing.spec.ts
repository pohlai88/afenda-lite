import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * N7 — authenticated post-login routing proof (@journey).
 *
 * Requires real Neon Auth test accounts (external dependency). When the
 * `E2E_*` credentials are absent the cases skip with a named reason — they
 * never fabricate an authenticated pass.
 *
 * Open-redirect rejection is proven by unit tests on `sanitizeCallbackUrl`
 * plus the AuthUiProvider wiring that forces every post-login navigate through
 * that allowlist. Authenticated cases below prove the end-to-end landing.
 */

const operatorEmail = process.env.E2E_OPERATOR_EMAIL;
const operatorPassword = process.env.E2E_OPERATOR_PASSWORD;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;

const hasOperator = Boolean(operatorEmail && operatorPassword);
const hasClient = Boolean(clientEmail && clientPassword);

async function signIn(
	page: import("@playwright/test").Page,
	email: string,
	password: string,
): Promise<void> {
	await page.getByRole("textbox", { name: /email/i }).fill(email);
	await page.locator('input[type="password"]').first().fill(password);
	await page
		.getByRole("button", { name: /sign in|log in|login|continue/i })
		.first()
		.click();
}

test.describe("post-login routing @journey", () => {
	test("operator lands on /admin and signed-in / bounces to /admin", async ({
		page,
	}) => {
		test.skip(!hasOperator, "E2E_OPERATOR_* credentials not configured");
		await page.goto("/auth/login");
		await signIn(page, operatorEmail ?? "", operatorPassword ?? "");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 30_000 });
		expect(new URL(page.url()).pathname).toMatch(/^\/admin/);

		await page.goto("/");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
		expect(new URL(page.url()).pathname).toMatch(/^\/admin/);
	});

	test("client lands on /client/dashboard", async ({ page }) => {
		test.skip(!hasClient, "E2E_CLIENT_* credentials not configured");
		await page.goto("/auth/login");
		await signIn(page, clientEmail ?? "", clientPassword ?? "");
		await page.waitForURL(/\/client\/dashboard(\/|$)/, { timeout: 30_000 });
		expect(new URL(page.url()).pathname).toBe("/client/dashboard");
	});

	test("authorized deep link returns to its original same-origin path", async ({
		page,
	}) => {
		test.skip(!hasOperator, "E2E_OPERATOR_* credentials not configured");
		await page.goto("/fft");
		await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
		await signIn(page, operatorEmail ?? "", operatorPassword ?? "");
		await page.waitForURL(/\/fft(\/|$)/, { timeout: 30_000 });
		expect(new URL(page.url()).pathname).toMatch(/^\/fft/);
	});

	test("external callback is rejected — lands on role home, not external", async ({
		page,
	}) => {
		test.skip(!hasOperator, "E2E_OPERATOR_* credentials not configured");
		await page.goto("/auth/login?redirectTo=https://example.com/evil");
		await signIn(page, operatorEmail ?? "", operatorPassword ?? "");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 30_000 });
		expect(page.url()).not.toContain("example.com");
		expect(new URL(page.url()).pathname).toMatch(/^\/admin/);
	});

	test("wrong-role shell access stays /403", async ({ page }) => {
		test.skip(!hasOperator, "E2E_OPERATOR_* credentials not configured");
		await page.goto("/auth/login");
		await signIn(page, operatorEmail ?? "", operatorPassword ?? "");
		await page.waitForURL(/\/admin(\/|$)/, { timeout: 30_000 });
		await page.goto("/client/dashboard");
		await page.waitForURL(/\/403(\/|$)/, { timeout: 15_000 });
		expect(new URL(page.url()).pathname).toBe("/403");
	});
});
