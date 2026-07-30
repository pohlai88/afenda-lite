import type { BrowserContext, Page } from "@playwright/test";

const EMAIL_LABEL_PATTERN = /email/i;
const SIGN_IN_LABEL_PATTERN = /sign in|log in|login|continue/i;
const ADMIN_PATH_PATTERN = /\/admin(\/|$)/;
const CLIENT_PATH_PATTERN = /\/client(\/|$)/;
type CachedAuthState = Awaited<ReturnType<BrowserContext["storageState"]>>;

const cachedAuthStates = new Map<string, CachedAuthState>();

export interface LoginPair {
	email: string;
	password: string;
}

/**
 * Fill Neon Auth login form and submit.
 * Caller owns navigation to `/auth/login` (or a redirect that lands there).
 */
export async function signIn(
	page: Page,
	email: string,
	password: string,
): Promise<void> {
	await page.getByRole("textbox", { name: EMAIL_LABEL_PATTERN }).fill(email);
	await page.locator('input[type="password"]').first().fill(password);
	await page
		.getByRole("button", { name: SIGN_IN_LABEL_PATTERN })
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
	const waitFor = options?.waitFor ?? ADMIN_PATH_PATTERN;
	const timeout = options?.timeoutMs ?? 45_000;
	const cacheKey = pair.email.trim().toLowerCase();
	const cachedState = cachedAuthStates.get(cacheKey);
	if (cachedState !== undefined) {
		await page.context().addCookies(cachedState.cookies);
		await page.goto("/");
		await page.waitForURL(waitFor, { timeout });
		return;
	}

	await page.goto("/auth/login");
	await signIn(page, pair.email, pair.password);
	await page.waitForURL(waitFor, { timeout });
	cachedAuthStates.set(cacheKey, await page.context().storageState());
}

/** Operator / admin shell login → `/admin`. */
export async function loginAsOperator(
	page: Page,
	pair: LoginPair,
): Promise<void> {
	await loginAs(page, pair, { waitFor: ADMIN_PATH_PATTERN });
}

/** Client shell login → `/client`. */
export async function loginAsClient(
	page: Page,
	pair: LoginPair,
): Promise<void> {
	await loginAs(page, pair, { waitFor: CLIENT_PATH_PATTERN });
}
