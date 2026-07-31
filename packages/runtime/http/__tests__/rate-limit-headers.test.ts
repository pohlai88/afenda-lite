import { describe, expect, it } from "vitest";

import { http } from "../src";

describe("@afenda/http applyRateLimitHeaders", () => {
	it("sets Limit Remaining and Reset (epoch seconds)", () => {
		const headers = new Headers();
		http.headers.applyRateLimit(headers, {
			limit: 20,
			remaining: 17,
			resetEpochMs: 1_700_000_000_500,
		});
		expect(headers.get("X-RateLimit-Limit")).toBe("20");
		expect(headers.get("X-RateLimit-Remaining")).toBe("17");
		expect(headers.get("X-RateLimit-Reset")).toBe("1700000000");
	});

	it("floors finite values and rejects invalid quota state", () => {
		const headers = new Headers();
		http.headers.applyRateLimit(headers, {
			limit: 5.9,
			remaining: 1.9,
			resetEpochMs: 1000,
		});
		expect(headers.get("X-RateLimit-Limit")).toBe("5");
		expect(headers.get("X-RateLimit-Remaining")).toBe("1");
		expect(headers.get("X-RateLimit-Reset")).toBe("1");
		expect(() =>
			http.headers.applyRateLimit(new Headers(), {
				limit: 5,
				remaining: -1,
				resetEpochMs: 1000,
			}),
		).toThrow(RangeError);
	});

	it("attaches validated Retry-After delta seconds", () => {
		const headers = new Headers();
		http.headers.applyRetryAfter(headers, 30.9);
		expect(headers.get("Retry-After")).toBe("30");
		expect(() => http.headers.applyRetryAfter(headers, -1)).toThrow(RangeError);
	});
});
