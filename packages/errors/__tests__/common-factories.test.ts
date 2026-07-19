import { describe, expect, it } from "vitest";

import { rateLimited, serviceUnavailable } from "../src/common/index";
import {
	clampRetryAfterSeconds,
	MIN_RETRY_AFTER_SECONDS,
	retryAfterSeconds,
} from "../src/core/retry-after";

describe("rateLimited / serviceUnavailable", () => {
	it("rateLimited clamps to integer >= 1 and keeps English message", () => {
		const error = rateLimited(30.9);
		expect(error.code).toBe("RATE_LIMITED");
		expect(error.isOperational).toBe(true);
		expect(error.message).toBe("Too many requests. Try again later.");
		expect(error.details).toEqual({ retryAfter: 30 });
		expect(retryAfterSeconds(error.details)).toBe(30);
	});

	it("rateLimited coerces invalid input to 1", () => {
		expect(rateLimited(Number.NaN).details).toEqual({ retryAfter: 1 });
		expect(rateLimited(0).details).toEqual({ retryAfter: 1 });
		expect(rateLimited(-5).details).toEqual({ retryAfter: 1 });
	});

	it("serviceUnavailable trims service and uses English message", () => {
		const error = serviceUnavailable("  neon-auth  ");
		expect(error.code).toBe("SERVICE_UNAVAILABLE");
		expect(error.isOperational).toBe(true);
		expect(error.message).toBe(
			"A required service is temporarily unavailable.",
		);
		expect(error.details).toEqual({ service: "neon-auth" });
	});

	it("serviceUnavailable falls back when empty", () => {
		expect(serviceUnavailable("   ").details).toEqual({ service: "service" });
	});
});

describe("retryAfterSeconds / clampRetryAfterSeconds", () => {
	it("returns undefined for missing or invalid details", () => {
		expect(retryAfterSeconds(undefined)).toBeUndefined();
		expect(retryAfterSeconds({ retryAfter: "30" })).toBeUndefined();
		expect(retryAfterSeconds({ retryAfter: 0 })).toBeUndefined();
		expect(retryAfterSeconds({ retryAfter: Number.NaN })).toBeUndefined();
	});

	it("clampRetryAfterSeconds floors and enforces minimum", () => {
		expect(clampRetryAfterSeconds(30.9)).toBe(30);
		expect(clampRetryAfterSeconds(0)).toBe(MIN_RETRY_AFTER_SECONDS);
		expect(clampRetryAfterSeconds(Number.NaN)).toBe(MIN_RETRY_AFTER_SECONDS);
	});
});
