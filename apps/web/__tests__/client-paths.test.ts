import {
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
} from "../features/auth/client-paths";
import {
	POST_LOGIN_PATHS_NOT_PUBLIC,
	PRE_LOGIN_GATE_BYPASS_PATHS,
	PRE_LOGIN_PUBLIC_ROUTE_PATHS,
} from "../features/auth/pre-login-route-contract";

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
