/**
 * PL-S3 — Auth Island surface inventory vs typed path contract + hard-stops.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PUBLIC_AUTH_PATHS } from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

import {
	MAIN_CONTENT_HASH,
	MAIN_CONTENT_ID,
} from "../features/auth/main-content";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("PL-S3 Auth Island surface", () => {
	it("keeps web main-content id/hash aligned with skip target", () => {
		expect(MAIN_CONTENT_ID).toBe("main-content");
		expect(MAIN_CONTENT_HASH).toBe("#main-content");
	});

	it("pins declared public auth segments (login not sign-in)", () => {
		expect([...PUBLIC_AUTH_PATHS]).toEqual([
			"login",
			"forgot-password",
			"reset-password",
			"sign-out",
			"sign-up",
		]);
	});

	it("keeps the dynamic auth page thin and fail-closed", () => {
		const page = source("app/(public)/auth/[path]/page.tsx");
		expect(page).toContain("isPublicAuthPath");
		expect(page).toContain("notFound()");
		expect(page).toContain("dynamicParams = false");
		expect(page).toContain("generateStaticParams");
		expect(page).toContain("PUBLIC_AUTH_PATHS");
		expect(page).toContain("AuthPathShell");
		expect(page).toContain('from "@afenda/auth"');
		expect(page).not.toMatch(/@neondatabase\/auth['"]/);
		expect(page).not.toMatch(/credential.*POST|fetch\(.*login/i);
	});

	it("renders Path A Afenda forms + Neon AuthView for forgot/reset", () => {
		const shell = source("features/auth/auth-path-shell.tsx");
		expect(shell).toContain("AfendaSignInForm");
		expect(shell).toContain("AfendaSignUpForm");
		expect(shell).toContain("AuthView");
		expect(shell).toContain("AuthSurfaceChrome");
		expect(shell).toContain("PublicAuthPath");
		expect(shell).toContain('from "@afenda/auth/client"');
		expect(shell).toContain('from "@neondatabase/auth-ui"');
		expect(shell).not.toMatch(/@neondatabase\/auth['"]/);

		const signIn = source("features/auth/afenda-sign-in-form.tsx");
		expect(signIn).toContain("signInAction");
		expect(signIn).toContain('from "@afenda/ui-system"');
		expect(signIn).toContain("<form");
	});

	it("ships loading + error under the auth island", () => {
		expect(
			existsSync(path.join(webRoot, "app/(public)/auth/loading.tsx")),
		).toBe(true);
		expect(existsSync(path.join(webRoot, "app/(public)/auth/error.tsx"))).toBe(
			true,
		);
		const loading = source("app/(public)/auth/loading.tsx");
		const error = source("app/(public)/auth/error.tsx");
		expect(loading).toContain("SegmentLoading");
		expect(loading).toContain("asLandmark={false}");
		expect(error).toContain("SegmentError");
		expect(error).toContain("asLandmark={false}");
		expect(error).not.toMatch(/error\.message/);
	});

	it("gives AuthIslandLayout the sole #main-content landmark", () => {
		const island = source("features/auth/auth-island-layout.tsx");
		const chrome = source("features/auth/auth-surface-chrome.tsx");
		const messageShell = source("features/auth/public-message-shell.tsx");
		expect(island).toContain("MAIN_CONTENT_ID");
		expect(island).toMatch(/<main[^>]*id=\{MAIN_CONTENT_ID\}/);
		expect(chrome).not.toMatch(/<main[\s>]/);
		expect(chrome).toMatch(/<div className="auth-surface/);
		expect(messageShell).toContain("asLandmark");
		expect(messageShell).toContain('asLandmark ? "main" : "div"');
	});

	it("moves focus after Path A auth action errors", () => {
		const helper = source("features/auth/focus-auth-action-error.ts");
		const signIn = source("features/auth/afenda-sign-in-form.tsx");
		const signUp = source("features/auth/afenda-sign-up-form.tsx");
		expect(helper).toContain("focusAuthActionError");
		expect(helper).toContain("aria-invalid");
		expect(signIn).toContain("focusAuthActionError");
		expect(signUp).toContain("focusAuthActionError");
	});

	it("keeps skip link targeting #main-content from root layout", () => {
		const skip = source("features/auth/skip-to-main-content.tsx");
		const root = source("app/layout.tsx");
		expect(skip).toContain("MAIN_CONTENT_HASH");
		expect(skip).toContain("href={MAIN_CONTENT_HASH}");
		expect(root).toContain("SkipToMainContent");
	});

	it("does not restyle Closed Machine SignIn surface", () => {
		const cta = source("features/auth/sign-in-button.tsx");
		expect(cta).toContain('surface="machine"');
		expect(cta).toContain("sign-in-button--machine");
		expect(cta).toContain("CLOSED");
		expect(cta).toContain("AUTH_LOGIN_PATH");
		expect(cta).not.toContain('href="/auth/sign-in"');
	});

	it("keeps AuthUiProvider on auth-ui + @afenda/auth/client only", () => {
		const provider = source("features/auth/auth-ui-provider.tsx");
		expect(provider).toContain('from "@neondatabase/auth-ui"');
		expect(provider).toContain('from "@afenda/auth/client"');
		expect(provider).toContain("NeonAuthUIProvider");
		expect(provider).toContain("getBrowserAuthClient");
		expect(provider).not.toMatch(/@neondatabase\/auth['"]/);
	});
});
