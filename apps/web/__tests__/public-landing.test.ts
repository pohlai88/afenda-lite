/**
 * PL-S2 — anonymous `/` public landing contract.
 * The Machine + one Sign in CTA; skip-link target via MAIN_CONTENT_ID.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	AUTH_LOGIN_PATH,
	PRE_LOGIN_PUBLIC_PATHS,
	PUBLIC_LANDING_PATH,
} from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

import { MAIN_CONTENT_ID } from "../features/auth/main-content";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("public landing (PL-S2)", () => {
	it("keeps `/` on the Pre-Login public allowlist as PUBLIC_LANDING_PATH", () => {
		expect(PUBLIC_LANDING_PATH).toBe("/");
		expect(PRE_LOGIN_PUBLIC_PATHS).toContain(PUBLIC_LANDING_PATH);
	});

	it("pins Sign in CTA through SignInButton → AUTH_LOGIN_PATH", () => {
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		const cta = source("features/auth/sign-in-button.tsx");
		expect(stage).toContain("SignInButton");
		expect(stage).toContain('surface="machine"');
		expect(stage).not.toContain('href="/auth/sign-in"');
		expect(stage).not.toContain('href="/auth/login"');
		expect(cta).toContain("AUTH_LOGIN_PATH");
		expect(cta).toContain("<Link href={AUTH_LOGIN_PATH}>");
		expect(cta).toContain("Sign in");
		expect(cta).toContain("sign-in-button__mark");
		expect(cta).toContain("asChild");
		expect(cta).toContain("<Button");
		expect(cta).toContain('surface?: "default" | "machine"');
		expect(AUTH_LOGIN_PATH).toBe("/auth/login");
	});

	it("mounts The Machine for anonymous `/` with main-content landmark", () => {
		const page = source("app/(public)/page.tsx");
		const landing = source("features/landing/the-machine-landing.tsx");
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		expect(page).toContain("TheMachineLanding");
		expect(page).toContain('case "anonymous"');
		expect(page).not.toContain("PublicMessageShell");
		expect(landing).toContain("TheMachineLandingStage");
		expect(landing).toContain("machineFontVariables");
		expect(stage).toContain(`id={MAIN_CONTENT_ID}`);
		expect(stage).toContain("tabIndex={-1}");
		expect(stage).toContain('id="hero-title"');
		expect(stage).toContain("<h1");
		expect(MAIN_CONTENT_ID).toBe("main-content");
	});

	it("keeps public layout and landing free of post-login shell chrome", () => {
		const page = source("app/(public)/page.tsx");
		const layout = source("app/(public)/layout.tsx");
		const landing = source("features/landing/the-machine-landing.tsx");
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		for (const banned of [
			"OperatorPlatformShell",
			"OperatorPlatformChrome",
			"resolveOperatorShellNav",
			"@afenda/db",
		] as const) {
			expect(page).not.toContain(banned);
			expect(layout).not.toContain(banned);
			expect(landing).not.toContain(banned);
			expect(stage).not.toContain(banned);
		}
		expect(layout).toContain("return children");
	});

	it("mounts SkipToMainContent in the root layout", () => {
		const root = source("app/layout.tsx");
		expect(root).toContain("SkipToMainContent");
	});

	it("exhausts AuthBootstrap states before rendering the anonymous landing", () => {
		const page = source("app/(public)/page.tsx");
		expect(page).toContain("switch (bootstrap.state)");
		expect(page).toContain('case "anonymous"');
		expect(page).toContain("const _exhaustive: never = bootstrap");
	});

	it("wires Machine hero art under apps/web/public for Next static serve", () => {
		const engine = source("features/landing/machine-sensor-engine.ts");
		const css = source("features/landing/the-machine-landing.css");
		expect(engine).toContain(
			'MACHINE_ART_SOURCE = "/lynx/lynx-landing-standard.png"',
		);
		expect(css).toContain('url("/lynx/lynx-landing-standard.png")');
		expect(
			existsSync(join(webRoot, "public/lynx/lynx-landing-standard.png")),
		).toBe(true);
	});

	it("forbids The Machine stage hairline frame (.frame)", () => {
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		const css = source("features/landing/the-machine-landing.css");
		expect(stage).not.toContain('className="frame"');
		expect(css).not.toMatch(/(^|\n)\.frame(\s|,|\{|::)/);
		expect(css).toContain("CLOSED (edit-forbidden)");
		expect(css).toContain("Stage hairline frame");
	});

	it("pins cinematicZoom ken-burns on shared .art-zoom (22s · linear · scale 1.12)", () => {
		const css = source("features/landing/the-machine-landing.css");
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		expect(css).toContain("--cinematic-zoom-duration: 22s");
		expect(css).toContain(
			"animation: cinematicZoom var(--cinematic-zoom-duration) linear infinite",
		);
		expect(css).toContain("transform: scale(1.12)");
		expect(css).toContain("lynx-cinematic.html");
		expect(css).toContain(".art-zoom");
		expect(stage).toContain('className="art-plane art-zoom"');
		expect(stage).toContain('className="sensor-plane art-zoom"');
		expect(css).not.toContain(
			"animation: cinematicZoom 36s ease-in-out infinite alternate",
		);
	});

	it("applies lynx-guard dual-plane atmosphere without CDP chrome", () => {
		const css = source("features/landing/the-machine-landing.css");
		const stage = source("features/landing/the-machine-landing-stage.tsx");
		expect(css).toContain("--nebula:");
		expect(css).toContain("--void:");
		expect(css).toContain(".constellation");
		expect(stage).toContain('className="constellation"');
		expect(stage).toContain("Truth, guarded quietly.");
		expect(stage).toContain("Your truth. Our shield.");
		expect(stage).toContain("Secure");
		expect(stage).toContain("Confidential");
		expect(stage).toContain("Verified");
		expect(stage).not.toMatch(/Client Declaration Portal|Access Vault/);
		expect(stage).not.toContain("Continue with Google");
		expect(css).toContain("CLOSED (edit-forbidden)");
	});
});
