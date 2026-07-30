/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	badRequest,
	internalError,
	rateLimited,
	serviceUnavailable,
} from "../src/common/index";
import { MAX_PUBLIC_ERROR_MESSAGE_LENGTH } from "../src/core/public-error-policy";
import {
	clampRetryAfterSeconds,
	MAX_RETRY_AFTER_SECONDS,
	MIN_RETRY_AFTER_SECONDS,
	retryAfterSeconds,
} from "../src/core/retry-after";

describe("rateLimited / serviceUnavailable", () => {
	it("bounds public messages and removes control characters", () => {
		const error = badRequest(`  invalid\u0000\n${"x".repeat(1000)}  `);

		expect(
			Array.from(error.message).some((character) => {
				const codePoint = character.codePointAt(0);
				return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
			}),
		).toBe(false);
		expect(error.message.length).toBe(MAX_PUBLIC_ERROR_MESSAGE_LENGTH);
	});
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

	it("serviceUnavailable defaults to generic service", () => {
		expect(serviceUnavailable().details).toEqual({ service: "service" });
	});

	it("serviceUnavailable falls back for non-string runtime input", () => {
		expect(serviceUnavailable(123).details).toEqual({ service: "service" });
	});

	it("sanitizes unsafe details at factory construction", () => {
		const error = badRequest("Invalid request", {
			field: "email",
			password: "secret",
			stack: "Error: boom",
			sql: "SELECT * FROM users",
			nested: {
				token: "secret",
				reason: "required",
			},
		});
		expect(error.details).toEqual({
			field: "email",
			nested: { reason: "required" },
		});
	});

	it("drops non-record details at factory construction", () => {
		expect(internalError("Failure", "unsafe string").details).toBeUndefined();
		expect(internalError("Failure", ["unsafe"]).details).toBeUndefined();
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

	it("clampRetryAfterSeconds enforces maximum", () => {
		expect(clampRetryAfterSeconds(MAX_RETRY_AFTER_SECONDS + 1)).toBe(
			MAX_RETRY_AFTER_SECONDS,
		);
	});

	it("retryAfterSeconds rejects values above maximum", () => {
		expect(
			retryAfterSeconds({ retryAfter: MAX_RETRY_AFTER_SECONDS + 1 }),
		).toBeUndefined();
		expect(retryAfterSeconds({ retryAfter: MAX_RETRY_AFTER_SECONDS })).toBe(
			MAX_RETRY_AFTER_SECONDS,
		);
	});

	it("retryAfterSeconds fails closed when retryAfter cannot be read", () => {
		const throwingGetter = Object.defineProperty({}, "retryAfter", {
			get() {
				throw new Error("getter failure");
			},
		});
		const throwingProxy = new Proxy(
			{},
			{
				get() {
					throw new Error("proxy failure");
				},
			},
		);

		expect(() => retryAfterSeconds(throwingGetter)).not.toThrow();
		expect(retryAfterSeconds(throwingGetter)).toBeUndefined();
		expect(() => retryAfterSeconds(throwingProxy)).not.toThrow();
		expect(retryAfterSeconds(throwingProxy)).toBeUndefined();
	});
});
