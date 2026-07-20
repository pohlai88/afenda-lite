import { describe, expect, it } from "vitest";

import {
	applySecurityHeaders,
	CONTENT_TYPE_OPTIONS_HEADER,
	CSP_HEADER,
	DEFAULT_SECURITY_HEADERS,
	FRAME_OPTIONS_HEADER,
	HSTS_HEADER,
	PERMISSIONS_POLICY_HEADER,
	securityHeadersForNext,
	strictSecurityHeadersForNext,
} from "../src/headers";

describe("@afenda/security securityHeadersForNext", () => {
	it("matches the living baseline without CSP/HSTS", () => {
		const headers = securityHeadersForNext();
		expect(headers).toEqual([...DEFAULT_SECURITY_HEADERS]);
		expect(headers.some((h) => h.key === CSP_HEADER)).toBe(false);
		expect(headers.some((h) => h.key === HSTS_HEADER)).toBe(false);
		expect(
			headers.find((h) => h.key === PERMISSIONS_POLICY_HEADER)?.value,
		).toBe("camera=(), microphone=(), geolocation=(), payment=()");
	});

	it("overrides Permissions-Policy when configured", () => {
		const headers = securityHeadersForNext({
			permissionsPolicy: "camera=(self)",
		});
		expect(
			headers.find((h) => h.key === PERMISSIONS_POLICY_HEADER)?.value,
		).toBe("camera=(self)");
	});

	it("includes CSP when opted in", () => {
		const headers = securityHeadersForNext({ includeCsp: true });
		const csp = headers.find((h) => h.key === CSP_HEADER);
		expect(csp?.value).toContain("default-src 'self'");
		expect(headers.find((h) => h.key === FRAME_OPTIONS_HEADER)?.value).toBe(
			"SAMEORIGIN",
		);
		expect(
			headers.find((h) => h.key === CONTENT_TYPE_OPTIONS_HEADER)?.value,
		).toBe("nosniff");
	});

	it("derives X-Frame-Options DENY from frameAncestors none", () => {
		const headers = securityHeadersForNext({
			includeCsp: true,
			frameAncestors: ["'none'"],
		});
		const csp = headers.find((h) => h.key === CSP_HEADER)?.value ?? "";
		expect(csp).toContain("frame-ancestors 'none'");
		expect(headers.find((h) => h.key === FRAME_OPTIONS_HEADER)?.value).toBe(
			"DENY",
		);
	});

	it("lets explicit frameOptions win over frameAncestors none", () => {
		const headers = securityHeadersForNext({
			frameAncestors: ["'none'"],
			frameOptions: "SAMEORIGIN",
		});
		expect(headers.find((h) => h.key === FRAME_OPTIONS_HEADER)?.value).toBe(
			"SAMEORIGIN",
		);
	});

	it("honors frameOptions DENY", () => {
		const headers = securityHeadersForNext({ frameOptions: "DENY" });
		expect(headers.find((h) => h.key === FRAME_OPTIONS_HEADER)?.value).toBe(
			"DENY",
		);
	});

	it("merges reportUri and reportTo into CSP when includeCsp", () => {
		const headers = securityHeadersForNext({
			includeCsp: true,
			reportUri: "https://example.com/csp",
			reportTo: "csp-endpoint",
		});
		const csp = headers.find((h) => h.key === CSP_HEADER)?.value ?? "";
		expect(csp).toContain("report-uri https://example.com/csp");
		expect(csp).toContain("report-to csp-endpoint");
	});

	it("does not emit report directives without includeCsp", () => {
		const headers = securityHeadersForNext({
			reportUri: "https://example.com/csp",
		});
		expect(headers.some((h) => h.key === CSP_HEADER)).toBe(false);
	});

	it("includes HSTS when opted in", () => {
		const headers = securityHeadersForNext({ hsts: true });
		expect(headers.find((h) => h.key === HSTS_HEADER)?.value).toBe(
			"max-age=31536000; includeSubDomains",
		);
	});

	it("appends preload only when hstsPreload is true", () => {
		const headers = securityHeadersForNext({
			hsts: true,
			hstsPreload: true,
		});
		expect(headers.find((h) => h.key === HSTS_HEADER)?.value).toBe(
			"max-age=31536000; includeSubDomains; preload",
		);
	});

	it("omits includeSubDomains when disabled", () => {
		const headers = securityHeadersForNext({
			hsts: true,
			hstsIncludeSubdomains: false,
			hstsMaxAge: 60,
		});
		expect(headers.find((h) => h.key === HSTS_HEADER)?.value).toBe(
			"max-age=60",
		);
	});
});

describe("@afenda/security strictSecurityHeadersForNext", () => {
	it("opts into strict CSP, DENY frames, and HSTS", () => {
		const headers = strictSecurityHeadersForNext();
		const csp = headers.find((h) => h.key === CSP_HEADER)?.value ?? "";
		expect(csp).toContain("script-src 'self' 'strict-dynamic'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("upgrade-insecure-requests");
		expect(headers.find((h) => h.key === FRAME_OPTIONS_HEADER)?.value).toBe(
			"DENY",
		);
		expect(headers.find((h) => h.key === HSTS_HEADER)?.value).toContain(
			"max-age=",
		);
	});

	it("keeps CSP when caller tries to disable includeCsp", () => {
		const headers = strictSecurityHeadersForNext({ includeCsp: false });
		expect(headers.some((h) => h.key === CSP_HEADER)).toBe(true);
	});
});

describe("@afenda/security applySecurityHeaders", () => {
	it("copies the Next-shaped list onto Fetch Headers", () => {
		const headers = new Headers();
		applySecurityHeaders(headers);
		expect(headers.get(FRAME_OPTIONS_HEADER)).toBe("SAMEORIGIN");
		expect(headers.get(CONTENT_TYPE_OPTIONS_HEADER)).toBe("nosniff");
		expect(headers.get(PERMISSIONS_POLICY_HEADER)).toContain("camera=()");
	});
});
