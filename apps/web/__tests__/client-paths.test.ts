import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	AUTH_LOGIN_PATH,
	CLIENT_HOME_PATH,
	isPreLoginPublicPath,
	PRE_LOGIN_PUBLIC_PATHS,
} from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

import {
	CLIENT_DASHBOARD_ALIAS_PATH,
	CLIENT_DASHBOARD_PATH,
	CLIENT_GATE_PATHS,
	CLIENT_LOGIN_PATH,
	CLIENT_PREVIEW_UNAVAILABLE_PATH,
	type ClientGatePath,
} from "../features/auth/client-paths";
import {
	POST_LOGIN_PATHS_NOT_PUBLIC,
	PRE_LOGIN_GATE_BYPASS_PATHS,
	PRE_LOGIN_PUBLIC_ROUTE_PATHS,
} from "../features/auth/pre-login-route-contract";

const webRoot = resolve(import.meta.dirname, "..");
const gateLoginPage = resolve(
	webRoot,
	"app/(client)/client/(gate)/login/page.tsx",
);
const gatePreviewPage = resolve(
	webRoot,
	"app/(client)/client/(gate)/preview-unavailable/page.tsx",
);

/** Product / authz surfaces forbidden on anonymous gate routes (PL-S6). */
const FORBIDDEN_GATE_IMPORT_MARKERS = [
	"requireRole",
	"features/declarations",
	"features/org-admin",
	"features/portal-chrome",
	"modules/declarations",
	"@afenda/db",
] as const;

describe("client path SSOT (PL-S1)", () => {
	it("keeps gate paths aligned with session-gate bypasses", () => {
		expect(CLIENT_LOGIN_PATH).toBe("/client/login");
		expect(CLIENT_PREVIEW_UNAVAILABLE_PATH).toBe("/client/preview-unavailable");
		expect([...CLIENT_GATE_PATHS]).toEqual([
			"/client/login",
			"/client/preview-unavailable",
		]);
		expect([...PRE_LOGIN_GATE_BYPASS_PATHS]).toEqual([...CLIENT_GATE_PATHS]);
	});

	it("keeps workspace declarations home path stable and pinned to auth SSOT", () => {
		expect(CLIENT_DASHBOARD_PATH).toBe("/client/declarations");
		expect(CLIENT_DASHBOARD_PATH).toBe(CLIENT_HOME_PATH);
		expect(CLIENT_DASHBOARD_ALIAS_PATH).toBe("/client/dashboard");
		expect(CLIENT_DASHBOARD_ALIAS_PATH).not.toBe(CLIENT_DASHBOARD_PATH);
	});

	it("does not classify gate or post-login client paths as public", () => {
		for (const gatePath of CLIENT_GATE_PATHS) {
			expect(isPreLoginPublicPath(gatePath)).toBe(false);
			expect(PRE_LOGIN_PUBLIC_ROUTE_PATHS).not.toContain(gatePath);
			expect(PRE_LOGIN_PUBLIC_PATHS).not.toContain(gatePath);
		}
		expect(isPreLoginPublicPath(CLIENT_DASHBOARD_PATH)).toBe(false);
		expect(isPreLoginPublicPath(CLIENT_DASHBOARD_ALIAS_PATH)).toBe(false);
		expect(POST_LOGIN_PATHS_NOT_PUBLIC).toContain(CLIENT_HOME_PATH);
		expect(POST_LOGIN_PATHS_NOT_PUBLIC).toContain(CLIENT_DASHBOARD_ALIAS_PATH);
	});
});

describe("client gate aliases (PL-S6)", () => {
	it("types every CLIENT_GATE_PATHS member as ClientGatePath", () => {
		const typed: readonly ClientGatePath[] = CLIENT_GATE_PATHS;
		expect(typed).toHaveLength(2);
		expect(typed).toContain(CLIENT_LOGIN_PATH);
		expect(typed).toContain(CLIENT_PREVIEW_UNAVAILABLE_PATH);
	});

	it("redirects /client/login to AUTH_LOGIN_PATH without a second auth UI", () => {
		const source = readFileSync(gateLoginPage, "utf8");
		expect(source).toContain("redirect(");
		expect(source).toContain("AUTH_LOGIN_PATH");
		expect(AUTH_LOGIN_PATH).toBe("/auth/login");
		expect(CLIENT_GATE_PATHS).not.toContain(AUTH_LOGIN_PATH);
		expect(source).not.toMatch(/AuthView|NeonAuth|sign-in-form|login-form/i);
		for (const marker of FORBIDDEN_GATE_IMPORT_MARKERS) {
			expect(source).not.toContain(marker);
		}
	});

	it("keeps preview-unavailable as anonymous shell without product data fetch", () => {
		const source = readFileSync(gatePreviewPage, "utf8");
		expect(source).toContain("PreviewUnavailableShell");
		expect(source).not.toContain("redirect(");
		for (const marker of FORBIDDEN_GATE_IMPORT_MARKERS) {
			expect(source).not.toContain(marker);
		}
	});
});
