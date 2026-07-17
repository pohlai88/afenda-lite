import { describe, expect, it } from "vitest";

import {
	CLIENT_HOME_PATH,
	OPERATOR_HOME_PATH,
	POST_LOGIN_CALLBACK_PARAM,
	resolvePostLoginPath,
	resolveRoleHome,
	sanitizeCallbackUrl,
} from "../src/post-login";

describe("resolveRoleHome (N7)", () => {
	it("routes operator and admin to the operator shell", () => {
		expect(resolveRoleHome("operator")).toBe(OPERATOR_HOME_PATH);
		expect(resolveRoleHome("admin")).toBe(OPERATOR_HOME_PATH);
		expect(OPERATOR_HOME_PATH).toBe("/admin");
	});

	it("routes client to the declarations home", () => {
		expect(resolveRoleHome("client")).toBe(CLIENT_HOME_PATH);
		expect(CLIENT_HOME_PATH).toBe("/client/declarations");
	});
});

describe("sanitizeCallbackUrl (N7 same-origin allowlist)", () => {
	it("accepts absolute same-origin paths, preserving query and hash", () => {
		expect(sanitizeCallbackUrl("/fft")).toBe("/fft");
		expect(sanitizeCallbackUrl("/client/declarations")).toBe(
			"/client/declarations",
		);
		expect(sanitizeCallbackUrl("/admin/users?tab=roles#top")).toBe(
			"/admin/users?tab=roles#top",
		);
	});

	it("trims surrounding whitespace before validating", () => {
		expect(sanitizeCallbackUrl("  /fft  ")).toBe("/fft");
	});

	it("rejects protocol-relative and backslash host tricks", () => {
		expect(sanitizeCallbackUrl("//evil.com")).toBeNull();
		expect(sanitizeCallbackUrl("/\\evil.com")).toBeNull();
		expect(sanitizeCallbackUrl("/\\/evil.com")).toBeNull();
	});

	it("rejects absolute URLs and scheme prefixes", () => {
		expect(sanitizeCallbackUrl("https://evil.com")).toBeNull();
		expect(sanitizeCallbackUrl("http://evil.com/path")).toBeNull();
		expect(sanitizeCallbackUrl("javascript:alert(1)")).toBeNull();
		expect(sanitizeCallbackUrl("JavaScript:alert(1)")).toBeNull();
		expect(sanitizeCallbackUrl("data:text/html,evil")).toBeNull();
	});

	it("rejects relative paths that do not start with a single slash", () => {
		expect(sanitizeCallbackUrl("fft")).toBeNull();
		expect(sanitizeCallbackUrl("./fft")).toBeNull();
		expect(sanitizeCallbackUrl("../admin")).toBeNull();
	});

	it("rejects control characters, raw whitespace, and empty input", () => {
		expect(sanitizeCallbackUrl("/fft\nhost")).toBeNull();
		expect(sanitizeCallbackUrl("/fft\thost")).toBeNull();
		expect(sanitizeCallbackUrl("/fft host")).toBeNull();
		expect(sanitizeCallbackUrl("")).toBeNull();
		expect(sanitizeCallbackUrl("   ")).toBeNull();
	});

	it("rejects non-string input (fail closed)", () => {
		expect(sanitizeCallbackUrl(undefined)).toBeNull();
		expect(sanitizeCallbackUrl(null)).toBeNull();
		expect(sanitizeCallbackUrl(42)).toBeNull();
		expect(sanitizeCallbackUrl(["/fft"])).toBeNull();
		expect(sanitizeCallbackUrl({ path: "/fft" })).toBeNull();
	});
});

describe("resolvePostLoginPath (N7 governed resolver)", () => {
	it("prefers a safe same-origin callback over the role home", () => {
		expect(
			resolvePostLoginPath({ role: "operator", callbackUrl: "/fft" }),
		).toBe("/fft");
		expect(
			resolvePostLoginPath({
				role: "client",
				callbackUrl: "/client/declarations",
			}),
		).toBe("/client/declarations");
	});

	it("falls back to the role home when the callback is unsafe", () => {
		expect(
			resolvePostLoginPath({ role: "operator", callbackUrl: "//evil.com" }),
		).toBe(OPERATOR_HOME_PATH);
		expect(
			resolvePostLoginPath({ role: "client", callbackUrl: "https://evil.com" }),
		).toBe(CLIENT_HOME_PATH);
	});

	it("falls back to the role home when no callback is present", () => {
		expect(resolvePostLoginPath({ role: "admin" })).toBe(OPERATOR_HOME_PATH);
		expect(resolvePostLoginPath({ role: "client" })).toBe(CLIENT_HOME_PATH);
	});

	it("does not role-filter the callback (wrong-role deep link still lands)", () => {
		// A client deep-linking an operator path lands there, then the shell's
		// requireRole redirects to /403 — the resolver stays coarse.
		expect(
			resolvePostLoginPath({ role: "client", callbackUrl: "/admin" }),
		).toBe("/admin");
	});

	it("keeps the callback param name on the better-auth-ui convention", () => {
		expect(POST_LOGIN_CALLBACK_PARAM).toBe("redirectTo");
	});
});
