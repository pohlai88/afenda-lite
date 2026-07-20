import { describe, expect, it } from "vitest";

import { sanitizeSearchMetadata } from "../src/sanitize";

describe("sanitizeSearchMetadata", () => {
	it("returns null for undefined or empty", () => {
		expect(sanitizeSearchMetadata(undefined)).toBeNull();
		expect(sanitizeSearchMetadata(null)).toBeNull();
		expect(sanitizeSearchMetadata({})).toBeNull();
	});

	it("strips sensitive keys case-insensitively", () => {
		expect(
			sanitizeSearchMetadata({
				role: "admin",
				password: "secret",
				apiKey: "k",
				refresh_token: "t",
				nested: { accessToken: "x", label: "ok" },
			}),
		).toEqual({
			role: "admin",
			nested: { label: "ok" },
		});
	});
});
