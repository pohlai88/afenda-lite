import { describe, expect, it } from "vitest";

import {
	AFENDA_AUTH_VIEW_PATHS,
	AUTH_BASE_PATH,
	AUTH_LOGIN_PATH,
	isPublicAuthPath,
	PUBLIC_AUTH_PATHS,
} from "../src/auth-paths";

describe("Afenda auth paths (I1.2)", () => {
	it("keeps AUTH_LOGIN_PATH on /auth/login as the gate SSOT", () => {
		expect(AFENDA_AUTH_VIEW_PATHS.SIGN_IN).toBe("login");
		expect(AUTH_LOGIN_PATH).toBe("/auth/login");
		expect(`${AUTH_BASE_PATH}/${AFENDA_AUTH_VIEW_PATHS.SIGN_IN}`).toBe(
			AUTH_LOGIN_PATH,
		);
	});

	it("exports public login · forgot · reset · sign-out · sign-up", () => {
		expect([...PUBLIC_AUTH_PATHS]).toEqual([
			"login",
			"forgot-password",
			"reset-password",
			"sign-out",
			"sign-up",
		]);
		expect(isPublicAuthPath("login")).toBe(true);
		expect(isPublicAuthPath("forgot-password")).toBe(true);
		expect(isPublicAuthPath("reset-password")).toBe(true);
		expect(isPublicAuthPath("sign-out")).toBe(true);
		expect(isPublicAuthPath("sign-up")).toBe(true);
		expect(isPublicAuthPath("accept-invitation")).toBe(false);
		expect(isPublicAuthPath("sign-in")).toBe(false);
	});

	it("maps ACCEPT_INVITATION for Neon UI viewPaths (sibling redirect route)", () => {
		expect(AFENDA_AUTH_VIEW_PATHS.ACCEPT_INVITATION).toBe("accept-invitation");
	});
});
