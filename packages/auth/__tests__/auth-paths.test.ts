import { describe, expect, it } from "vitest";

import {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_ACCEPT_INVITATION_PATH,
	AUTH_API_BASE_PATH,
	AUTH_BASE_PATH,
	AUTH_FORBIDDEN_PATH,
	AUTH_FORGOT_PASSWORD_PATH,
	AUTH_LOGIN_PATH,
	AUTH_RESET_PASSWORD_PATH,
	AUTH_SIGN_OUT_PATH,
	isPreLoginPublicPath,
	isPublicAuthPath,
	isRejectedAuthPathAlias,
	PRE_LOGIN_PUBLIC_PATHS,
	PUBLIC_AUTH_FULL_PATHS,
	PUBLIC_AUTH_PATHS,
	PUBLIC_LANDING_PATH,
	REJECTED_AUTH_PATH_ALIASES,
} from "../src/auth-paths";
import { JOIN_PATH } from "../src/join-paths";
import { CLIENT_HOME_PATH, OPERATOR_HOME_PATH } from "../src/post-login";

describe("Afenda auth paths (I1.2 · I1.4 · N5 · PL-S1)", () => {
	it("keeps AUTH_LOGIN_PATH on /auth/login as the gate SSOT", () => {
		expect(AFENDA_AUTH_VIEW_PATHS.SIGN_IN).toBe("login");
		expect(AUTH_LOGIN_PATH).toBe("/auth/login");
		expect(`${AUTH_BASE_PATH}/${AFENDA_AUTH_VIEW_PATHS.SIGN_IN}`).toBe(
			AUTH_LOGIN_PATH,
		);
	});

	it("derives public auth full paths from AUTH_BASE_PATH + view segments", () => {
		expect(AUTH_FORGOT_PASSWORD_PATH).toBe("/auth/forgot-password");
		expect(AUTH_RESET_PASSWORD_PATH).toBe("/auth/reset-password");
		expect(AUTH_SIGN_OUT_PATH).toBe("/auth/sign-out");
		expect(AUTH_ACCEPT_INVITATION_PATH).toBe("/auth/accept-invitation");
	});

	it("keeps AUTH_API_BASE_PATH on /api/auth as the BFF SSOT", () => {
		expect(AUTH_API_BASE_PATH).toBe("/api/auth");
	});

	it("keeps AUTH_FORBIDDEN_PATH on /403 for wrong-role shells", () => {
		expect(AUTH_FORBIDDEN_PATH).toBe("/403");
	});

	it("exports public login · forgot · reset · sign-out (not sign-up)", () => {
		expect([...PUBLIC_AUTH_PATHS]).toEqual([
			"login",
			"forgot-password",
			"reset-password",
			"sign-out",
		]);
		expect(isPublicAuthPath("login")).toBe(true);
		expect(isPublicAuthPath("forgot-password")).toBe(true);
		expect(isPublicAuthPath("reset-password")).toBe(true);
		expect(isPublicAuthPath("sign-out")).toBe(true);
		expect(isPublicAuthPath("sign-up")).toBe(false);
		expect(isPublicAuthPath("accept-invitation")).toBe(false);
		expect(isPublicAuthPath("sign-in")).toBe(false);
	});

	it("keeps AFENDA_AUTH_VIEW_PATHS.SIGN_UP for Neon viewPaths only", () => {
		expect(AFENDA_AUTH_VIEW_PATHS.SIGN_UP).toBe("sign-up");
		expect(isPublicAuthPath(AFENDA_AUTH_VIEW_PATHS.SIGN_UP)).toBe(false);
		expect(isPreLoginPublicPath(`${AUTH_BASE_PATH}/sign-up`)).toBe(false);
	});

	it("rejects undeclared sign-in alias (not AUTH_LOGIN_PATH)", () => {
		const [rejectedSignIn] = REJECTED_AUTH_PATH_ALIASES;
		expect(rejectedSignIn).toBe(`${AUTH_BASE_PATH}/sign-in`);
		expect(rejectedSignIn).not.toBe(AUTH_LOGIN_PATH);
		expect(isRejectedAuthPathAlias(rejectedSignIn)).toBe(true);
		expect(isRejectedAuthPathAlias(AUTH_LOGIN_PATH)).toBe(false);
		expect(isPreLoginPublicPath(rejectedSignIn)).toBe(false);
	});

	it("maps ACCEPT_INVITATION as redirect-only, not a public Auth UI page", () => {
		expect(AFENDA_AUTH_VIEW_PATHS.ACCEPT_INVITATION).toBe("accept-invitation");
		expect(isPublicAuthPath(AFENDA_AUTH_VIEW_PATHS.ACCEPT_INVITATION)).toBe(
			false,
		);
		expect(isPreLoginPublicPath(AUTH_ACCEPT_INVITATION_PATH)).toBe(false);
	});

	it("exports PRE_LOGIN_PUBLIC_PATHS as the document-public allowlist", () => {
		expect([...PRE_LOGIN_PUBLIC_PATHS]).toEqual([
			PUBLIC_LANDING_PATH,
			...PUBLIC_AUTH_FULL_PATHS,
			JOIN_PATH,
			AUTH_FORBIDDEN_PATH,
		]);
		expect(PUBLIC_AUTH_FULL_PATHS).toEqual([
			AUTH_LOGIN_PATH,
			AUTH_FORGOT_PASSWORD_PATH,
			AUTH_RESET_PASSWORD_PATH,
			AUTH_SIGN_OUT_PATH,
		]);
		expect(isPreLoginPublicPath(PUBLIC_LANDING_PATH)).toBe(true);
		expect(isPreLoginPublicPath(JOIN_PATH)).toBe(true);
	});

	it("does not classify post-login homes as public", () => {
		expect(isPreLoginPublicPath(CLIENT_HOME_PATH)).toBe(false);
		expect(isPreLoginPublicPath(OPERATOR_HOME_PATH)).toBe(false);
		expect(PRE_LOGIN_PUBLIC_PATHS).not.toContain(CLIENT_HOME_PATH);
		expect(PRE_LOGIN_PUBLIC_PATHS).not.toContain(OPERATOR_HOME_PATH);
	});
});
