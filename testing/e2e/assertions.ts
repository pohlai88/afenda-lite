import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const AUTH_LOGIN_PATH_PATTERN = /\/auth\/login/;
const FORBIDDEN_PATH_PATTERN = /\/403(\/|$)/;
const ADMIN_PATH_PATTERN = /^\/admin/;
const OPERATOR_ADMIN_LABEL_PATTERN = /Operator admin/i;

/** Anonymous visit to a protected path must land on `/auth/login`. */
export async function expectAnonymousRedirectToLogin(
	page: Page,
	protectedPath: string,
): Promise<void> {
	await page.goto(protectedPath);
	await page.waitForURL(AUTH_LOGIN_PATH_PATTERN, { timeout: 15_000 });
	expect(new URL(page.url()).pathname).toBe("/auth/login");
}

/** Authenticated user on a wrong-role shell stays on `/403`. */
export async function expectWrongRoleForbidden(
	page: Page,
	forbiddenPath: string,
): Promise<void> {
	await page.goto(forbiddenPath);
	await page.waitForURL(FORBIDDEN_PATH_PATTERN, { timeout: 15_000 });
	expect(new URL(page.url()).pathname).toBe("/403");
}

export function expectOperatorHome(pathname: string): void {
	expect(pathname).toMatch(ADMIN_PATH_PATTERN);
}

export function expectClientHome(pathname: string): void {
	expect(pathname).toBe("/client");
}

export interface OperatorShellNavExpectation {
	admin: boolean;
}

/**
 * N16 — assert permission-filtered operator platform shell sidebar links.
 */
export async function expectOperatorShellNav(
	page: Page,
	expectation: OperatorShellNavExpectation,
): Promise<void> {
	const adminLink = page.locator('a[href="/admin"]').filter({
		hasText: OPERATOR_ADMIN_LABEL_PATTERN,
	});

	if (expectation.admin) {
		await expect(adminLink.first()).toBeVisible({ timeout: 15_000 });
	} else {
		await expect(adminLink).toHaveCount(0);
	}
}
