import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, STRICT_CSP_DIRECTIVES } from "../src/csp";

describe("@afenda/security buildContentSecurityPolicy", () => {
	it("joins directives and values", () => {
		expect(
			buildContentSecurityPolicy({
				"default-src": ["'self'"],
				"object-src": ["'none'"],
			}),
		).toBe("default-src 'self'; object-src 'none'");
	});

	it("emits flag directives with empty values", () => {
		expect(
			buildContentSecurityPolicy({
				"upgrade-insecure-requests": [],
			}),
		).toBe("upgrade-insecure-requests");
	});

	it("builds STRICT_CSP_DIRECTIVES without empty gaps", () => {
		const value = buildContentSecurityPolicy(STRICT_CSP_DIRECTIVES);
		expect(value).toContain("frame-ancestors 'none'");
		expect(value).toContain("upgrade-insecure-requests");
	});
});
