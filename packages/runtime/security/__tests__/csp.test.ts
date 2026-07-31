import { describe, expect, it } from "vitest";
import { security } from "../src";

describe("@afenda/security CSP policy", () => {
	it("serializes valued and flag directives", () => {
		expect(
			security.csp.serialize({
				"default-src": ["'self'"],
				"upgrade-insecure-requests": [],
			}),
		).toBe("default-src 'self'; upgrade-insecure-requests");
	});

	it("rejects directive and value injection", () => {
		expect(() =>
			security.csp.serialize({ "bad;script-src": ["'self'"] }),
		).toThrow(RangeError);
		expect(() =>
			security.csp.serialize({ "default-src": ["'self'; report-uri evil"] }),
		).toThrow(RangeError);
	});
});
