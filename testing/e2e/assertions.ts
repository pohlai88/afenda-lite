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
	expect(pathname).toBe("/client/dashboard");
}
