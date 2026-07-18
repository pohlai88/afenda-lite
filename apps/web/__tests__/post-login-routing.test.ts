import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	resolveRoleHome,
} from "@afenda/auth/client";
import { describe, expect, it } from "vitest";

import { CLIENT_DASHBOARD_PATH } from "../features/auth/client-paths";
import { OPERATOR_ADMIN_PATH } from "../features/auth/operator-paths";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * N7 — post-login routing wiring.
 * The governed resolver lives in `@afenda/auth`; the app route constants and
 * redirect surfaces must stay pinned to it (no drift, no second resolver).
 */
describe("post-login routing wiring (N7)", () => {
	it("pins app role-home constants to the governed resolver SSOT", () => {
		expect(OPERATOR_ADMIN_PATH).toBe(OPERATOR_HOME_PATH);
		expect(CLIENT_DASHBOARD_PATH).toBe(CLIENT_HOME_PATH);
		expect(resolveRoleHome("operator")).toBe(OPERATOR_ADMIN_PATH);
		expect(resolveRoleHome("admin")).toBe(OPERATOR_ADMIN_PATH);
		expect(resolveRoleHome("client")).toBe(CLIENT_DASHBOARD_PATH);
	});

	it("bounces a signed-in `/` through the resolver, not a hardcoded path", () => {
		const source = readFileSync(join(webRoot, "app/(public)/page.tsx"), "utf8");
		expect(source).toContain("getAuthBootstrap");
		expect(source).toContain("resolvePostLoginPath");
		expect(source).toContain("redirect(");
		expect(source).toContain("POST_LOGIN_CALLBACK_PARAM");
		expect(source).toContain("ensure_active_org");
		expect(source).toContain("unresolved_organization");
		expect(source).toContain("UnresolvedOrganizationShell");
	});

	it("sanitizes AuthUiProvider redirectTo and navigate destinations", () => {
		const source = readFileSync(
			join(webRoot, "features/auth/auth-ui-provider.tsx"),
			"utf8",
		);
		expect(source).toContain("sanitizeCallbackUrl");
		expect(source).toContain("POST_LOGIN_CALLBACK_PARAM");
		expect(source).toContain("redirectTo={redirectTo}");
		expect(source).toContain("navigateSafe");
		expect(source).toContain("replaceSafe");
		expect(source).not.toContain("navigate={router.push}");
		expect(source).not.toContain("replace={router.replace}");
	});

	it("wraps AuthUiProvider in Suspense for useSearchParams", () => {
		const source = readFileSync(
			join(webRoot, "features/auth/auth-island-layout.tsx"),
			"utf8",
		);
		expect(source).toContain("Suspense");
		expect(source).toContain("AuthUiProvider");
	});
});
