import type { Page } from "@playwright/test";

export type LoginPair = {
	email: string;
	password: string;
};

/**
 * Fill Neon Auth login form and submit.
 * Caller owns navigation to `/auth/login` (or a redirect that lands there).
 */
export async function signIn(
	page: Page,
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

/**
 * Navigate to login, sign in, and wait for a post-login path.
 * Default wait matches operator shell; pass `waitFor` for client or deep links.
 */
export async function loginAs(
	page: Page,
	pair: LoginPair,
	options?: {
		waitFor?: RegExp;
		timeoutMs?: number;
	},
): Promise<void> {
	await page.goto("/auth/login");
	await signIn(page, pair.email, pair.password);
	await page.waitForURL(options?.waitFor ?? /\/admin(\/|$)/, {
		timeout: options?.timeoutMs ?? 45_000,
	});
}

/** Operator / admin shell login → `/admin`. */
export async function loginAsOperator(
	page: Page,
	pair: LoginPair,
): Promise<void> {
	await loginAs(page, pair, { waitFor: /\/admin(\/|$)/ });
}

/** Client shell login → `/client/declarations`. */
export async function loginAsClient(
	page: Page,
	pair: LoginPair,
): Promise<void> {
	await loginAs(page, pair, { waitFor: /\/client\/declarations(\/|$)/ });
}
