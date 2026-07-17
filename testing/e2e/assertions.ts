import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Anonymous visit to a protected path must land on `/auth/login`. */
export async function expectAnonymousRedirectToLogin(
	page: Page,
	protectedPath: string,
): Promise<void> {
	await page.goto(protectedPath);
	await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
	expect(new URL(page.url()).pathname).toBe("/auth/login");
}

/** Authenticated user on a wrong-role shell stays on `/403`. */
export async function expectWrongRoleForbidden(
	page: Page,
	forbiddenPath: string,
): Promise<void> {
	await page.goto(forbiddenPath);
	await page.waitForURL(/\/403(\/|$)/, { timeout: 15_000 });
	expect(new URL(page.url()).pathname).toBe("/403");
}

export function expectOperatorHome(pathname: string): void {
	expect(pathname).toMatch(/^\/admin/);
}

export function expectClientHome(pathname: string): void {
	expect(pathname).toBe("/client/declarations");
}

export type OperatorShellNavExpectation = {
	admin: boolean;
	fft: boolean;
};

/**
 * N16 — assert permission-filtered operator platform shell sidebar links.
 */
export async function expectOperatorShellNav(
	page: Page,
	expectation: OperatorShellNavExpectation,
): Promise<void> {
	const adminLink = page.locator('a[href="/admin"]').filter({
		hasText: /Operator admin/i,
	});
	const fftLink = page.locator('a[href="/fft"]').filter({
		hasText: /Feed Farm Trade/i,
	});

	if (expectation.admin) {
		await expect(adminLink.first()).toBeVisible({ timeout: 15_000 });
	} else {
		await expect(adminLink).toHaveCount(0);
	}

	if (expectation.fft) {
		await expect(fftLink.first()).toBeVisible({ timeout: 15_000 });
	} else {
		await expect(fftLink).toHaveCount(0);
	}
}
