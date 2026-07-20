import { describe, expect, it } from "vitest";

import {
	applyRateLimitHeaders,
	RATE_LIMIT_LIMIT_HEADER,
	RATE_LIMIT_REMAINING_HEADER,
	RATE_LIMIT_RESET_HEADER,
} from "../src/rate-limit-headers";

describe("@afenda/http applyRateLimitHeaders", () => {
	it("sets Limit Remaining and Reset (epoch seconds)", () => {
		const headers = new Headers();
		applyRateLimitHeaders(headers, {
			limit: 20,
			remaining: 17,
			resetEpochMs: 1_700_000_000_500,
		});
		expect(headers.get(RATE_LIMIT_LIMIT_HEADER)).toBe("20");
		expect(headers.get(RATE_LIMIT_REMAINING_HEADER)).toBe("17");
		expect(headers.get(RATE_LIMIT_RESET_HEADER)).toBe("1700000000");
	});

	it("floors and clamps negative remaining to zero", () => {
		const headers = new Headers();
		applyRateLimitHeaders(headers, {
			limit: 5.9,
			remaining: -1,
			resetEpochMs: 1000,
		});
		expect(headers.get(RATE_LIMIT_LIMIT_HEADER)).toBe("5");
		expect(headers.get(RATE_LIMIT_REMAINING_HEADER)).toBe("0");
		expect(headers.get(RATE_LIMIT_RESET_HEADER)).toBe("1");
	});
});
