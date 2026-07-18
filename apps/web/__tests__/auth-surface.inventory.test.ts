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
		expect(shell).not.toContain("AuthSurfaceChrome");
		expect(shell).toContain("PublicAuthPath");
		expect(shell).toContain('from "@afenda/auth/client"');
		expect(shell).toContain('from "@neondatabase/auth-ui"');
		expect(shell).not.toMatch(/@neondatabase\/auth['"]/);
		expect(shell).not.toContain("LocalAuthCredentialFill");
		expect(shell).not.toContain("localCredentials");

		const page = source("app/(public)/auth/[path]/page.tsx");
		expect(page).not.toContain("resolveLocalAuthCredentials");
		expect(page).not.toContain("localCredentials");

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
		const root = source("features/auth/auth-surface-root.tsx");
		const messageShell = source("features/auth/public-message-shell.tsx");
		expect(island).toContain("MAIN_CONTENT_ID");
		expect(island).toMatch(/<main[^>]*id=\{MAIN_CONTENT_ID\}/);
		expect(island).toContain("AuthSurfaceChrome");
		expect(chrome).not.toMatch(/<main[\s>]/);
		expect(chrome).toContain("AuthSurfaceRoot");
		expect(root).toContain("AUTH_SURFACE_CYCLE_MS");
		expect(root).toContain("animationDelay");
		expect(root).toContain("visibilitychange");
		expect(root).toContain("auth-surface--paused");
		expect(root).toContain("document.hidden");
		expect(root).toMatch(/className="auth-surface dark /);
		expect(messageShell).toContain("asLandmark");
		expect(messageShell).toContain('asLandmark ? "main" : "div"');
	});

	it("ships split-stage lynx chrome without Studio IdP forms", () => {
		const chrome = source("features/auth/auth-surface-chrome.tsx");
		const surfaceCss = source("app/(public)/auth/auth-surface.css");
		expect(chrome).toContain("AUTH_ISLAND_BRAND_ART_ICE");
		expect(chrome).toContain("AUTH_ISLAND_BRAND_ART_FIRE");
		expect(chrome).toContain("/lynx/lynx-icy3-wide.png");
		expect(chrome).toContain("/lynx/lynx-fire-wide.png");
		expect(chrome).toContain("auth-surface__art-plane");
		expect(chrome).toContain("auth-surface__brand-art--ice");
		expect(chrome).toContain("auth-surface__brand-art--fire");
		expect(chrome).toContain("auth-surface__radiant--ice");
		expect(chrome).toContain("auth-surface__radiant--fire");
		expect(chrome).toContain("auth-surface__weather");
		expect(chrome).toContain("auth-surface__snow");
		expect(chrome).toContain("auth-surface__steam");
		expect(chrome).toContain("auth-surface__embers");
		expect(chrome).toContain("auth-surface__panel-frost");
		expect(chrome).toContain("auth-surface__panel-ember");
		expect(chrome).toContain("auth-surface__panel-heat");
		expect(chrome).toContain('from "next/image"');
		expect(chrome).toContain("auth-surface__backdrop");
		expect(chrome).toContain("auth-surface__atmosphere");
		expect(chrome).toContain("auth-surface__radiant");
		expect(chrome).toContain("auth-surface__panel");
		expect(chrome).toContain("auth-surface__stage");
		expect(chrome).toContain("auth-surface__identity");
		expect(chrome).toContain("auth-surface__identity-eyebrow");
		expect(chrome).toContain("auth-surface__identity-tagline");
		expect(chrome).toContain("AFENDA IDENTITY");
		expect(chrome).toContain("Protected through");
		expect(chrome).toContain("every state.");
		expect(chrome).toContain("Identity secured. Access restored.");
		expect(chrome).toContain("AUTH_FORGOT_PASSWORD_PATH");
		expect(chrome).toContain("AUTH_RESET_PASSWORD_PATH");
		expect(chrome).toContain("usePathname");
		expect(chrome).not.toContain("data-phase");
		expect(chrome).toContain("object-cover");
		expect(chrome).toContain("object-center");
		expect(chrome).toContain('sizes="100vw"');
		expect(chrome).not.toContain("auth-surface__art-frame");
		expect(chrome).not.toContain("object-contain");
		expect(chrome).toContain("AuthSurfaceRoot");
		expect(surfaceCss).toContain("color-scheme: dark");
		expect(chrome).toContain('alt=""');
		expect(chrome).toContain('aria-hidden="true"');
		expect(chrome).not.toContain("object-left");
		expect(chrome).not.toContain("auth-surface__brand-rail");
		expect(chrome).not.toMatch(/<main[\s>]/);
		expect(chrome).not.toMatch(/shadcn-studio/);
		expect(chrome).not.toMatch(
			/Login with Google|Login with Facebook|LoginForm/,
		);
		expect(chrome).not.toMatch(/social\.providers|AvatarImage/);
		expect(surfaceCss).toContain("@property --auth-panel-ice");
		expect(surfaceCss).toContain("@property --auth-panel-fire");
		expect(surfaceCss).toContain("@property --auth-lynx-fire");
		expect(surfaceCss).toContain("@property --auth-snow");
		expect(surfaceCss).toContain("@property --auth-steam");
		expect(surfaceCss).toContain("@property --auth-embers");
		expect(surfaceCss).toContain("auth-surface-cinematic-cycle");
		expect(surfaceCss).toContain("auth-surface-snow-fall");
		expect(surfaceCss).toContain("auth-surface-steam-rise");
		expect(surfaceCss).toContain("auth-surface-ember-rise");
		expect(surfaceCss).toContain("auth-surface-heat-shimmer");
		expect(surfaceCss).toContain("auth-surface__art-plane");
		expect(surfaceCss).toContain("--auth-ken-zoom-duration: 22s");
		expect(surfaceCss).toContain("transform: scale(1.18)");
		expect(surfaceCss).toContain("translate3d(-2.1%, -1.4%, 0)");
		expect(surfaceCss).not.toContain("transform: scale(1.04)");
		expect(surfaceCss).toContain("auth-surface__weather");
		expect(surfaceCss).toContain("auth-surface__steam");
		expect(surfaceCss).toContain("auth-surface__embers");
		expect(surfaceCss).toContain("auth-surface__panel-frost");
		expect(surfaceCss).toContain("auth-surface__panel-ember");
		expect(surfaceCss).toContain("auth-surface__panel-heat");
		expect(surfaceCss).toContain("auth-surface__atmosphere");
		expect(surfaceCss).toContain("auth-surface__radiant");
		expect(surfaceCss).toContain("auth-surface__radiant--ice");
		expect(surfaceCss).toContain("auth-surface__radiant--fire");
		expect(surfaceCss).toContain("auth-surface__identity");
		expect(surfaceCss).toContain("auth-surface__identity-eyebrow");
		expect(surfaceCss).toContain("auth-surface__identity-tagline");
		expect(surfaceCss).toContain("auth-surface__identity-support");
		expect(surfaceCss).toContain("--auth-identity-ink");
		expect(surfaceCss).toContain("--auth-identity-muted");
		expect(surfaceCss).toContain("var(--auth-accent)");
		expect(surfaceCss).toContain("var(--auth-panel-fire)");
		expect(surfaceCss).toContain("max-width: 20rem");
		expect(surfaceCss).toContain("mix-blend-mode: screen");
		expect(surfaceCss).toContain("radial-gradient");
		expect(surfaceCss).toContain("conic-gradient");
		expect(surfaceCss).toContain("linear-gradient");
		expect(surfaceCss).toContain("var(--surface-raised)");
		expect(surfaceCss).toContain("var(--shadow-dialog)");
		expect(surfaceCss).toContain("var(--primary)");
		expect(surfaceCss).toContain("var(--info)");
		expect(surfaceCss).toContain("var(--warning)");
		expect(surfaceCss).toContain("var(--destructive)");
		expect(surfaceCss).toContain("var(--chart-1)");
		expect(surfaceCss).toContain("prefers-reduced-motion");
		expect(surfaceCss).toContain("auth-surface--paused");
		expect(surfaceCss).toContain("animation-play-state: paused");
		expect(surfaceCss).toContain("auth-surface-reduced-dissolve");
		expect(surfaceCss).toContain("max-width: 767.98px");
		expect(surfaceCss).toContain("auth-surface__ember-field--b");
		expect(surfaceCss).toContain("auth-surface__snow--b");
		expect(surfaceCss).not.toContain("--auth-element");
		expect(surfaceCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		expect(
			existsSync(path.join(webRoot, "public/lynx/lynx-icy3-wide.png")),
		).toBe(true);
		expect(
			existsSync(path.join(webRoot, "public/lynx/lynx-fire-wide.png")),
		).toBe(true);
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
