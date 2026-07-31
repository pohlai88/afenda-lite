import { describe, expect, it } from "vitest";
import { security } from "../src";

const find = (
	headers: readonly { name: string; value: string }[],
	name: string,
) => headers.find((header) => header.name === name)?.value;

describe("@afenda/security header policy", () => {
	it("creates the framework-neutral baseline", () => {
		const headers = security.headers.create();
		expect(find(headers, "X-Frame-Options")).toBe("SAMEORIGIN");
		expect(find(headers, "X-Content-Type-Options")).toBe("nosniff");
		expect(find(headers, "Permissions-Policy")).toBe(
			"camera=(), microphone=(), geolocation=(), payment=()",
		);
		expect(find(headers, "Content-Security-Policy")).toBeUndefined();
		expect(find(headers, "Strict-Transport-Security")).toBeUndefined();
		expect(headers[0]).toHaveProperty("name");
		expect(headers[0]).not.toHaveProperty("key");
	});

	it("derives CSP, frame denial, reports, and HSTS from one policy", () => {
		const headers = security.headers.create({
			includeCsp: true,
			frameAncestors: ["'none'"],
			reportUri: "https://example.com/csp",
			reportTo: "csp-endpoint",
			hsts: true,
			hstsPreload: true,
		});
		const csp = find(headers, "Content-Security-Policy");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("report-uri https://example.com/csp");
		expect(csp).toContain("report-to csp-endpoint");
		expect(find(headers, "X-Frame-Options")).toBe("DENY");
		expect(find(headers, "Strict-Transport-Security")).toBe(
			"max-age=31536000; includeSubDomains; preload",
		);
	});

	it("lets explicit frame policy win and supports bounded HSTS", () => {
		const headers = security.headers.create({
			frameAncestors: ["'none'"],
			frameOptions: "SAMEORIGIN",
			hsts: true,
			hstsIncludeSubdomains: false,
			hstsMaxAge: 60,
		});
		expect(find(headers, "X-Frame-Options")).toBe("SAMEORIGIN");
		expect(find(headers, "Strict-Transport-Security")).toBe("max-age=60");
	});

	it("creates the strict preset without allowing CSP removal", () => {
		const headers = security.headers.strict({ includeCsp: false });
		expect(find(headers, "Content-Security-Policy")).toContain(
			"script-src 'self' 'strict-dynamic'",
		);
		expect(find(headers, "X-Frame-Options")).toBe("DENY");
		expect(find(headers, "Strict-Transport-Security")).toContain("max-age=");
	});

	it("applies policy entries to Fetch Headers", () => {
		const headers = new Headers();
		security.headers.apply(headers);
		expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
		expect(headers.get("Permissions-Policy")).toContain("camera=()");
	});

	it("rejects injection and invalid HSTS values", () => {
		expect(() =>
			security.headers.create({ permissionsPolicy: "camera=()\r\nX-Evil: 1" }),
		).toThrow(RangeError);
		expect(() =>
			security.headers.create({ hsts: true, hstsMaxAge: -1 }),
		).toThrow(RangeError);
	});
});
