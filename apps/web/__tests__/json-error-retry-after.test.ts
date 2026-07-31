import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import { jsonFailure } from "@/modules/platform/api/json-response";

describe("jsonFailure Retry-After", () => {
	it("sets Retry-After from canonical bounded timing", async () => {
		const response = jsonFailure(
			errorResult.fail("RATE_LIMITED", {
				retryAfterSeconds: errorResult.retryAfterSeconds(30),
			}),
		);
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("30");
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "RATE_LIMITED",
				messageKey: "errors.rateLimited",
				message: "Too many requests. Try again later.",
				details: { retryAfterSeconds: 30 },
			},
		});
	});

	it("projects a canonical rate-limit failure", async () => {
		const limited = errorResult.fail("RATE_LIMITED", {
			retryAfterSeconds: errorResult.retryAfterSeconds(12),
		});
		const response = jsonFailure(limited);
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("12");
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "RATE_LIMITED",
				messageKey: "errors.rateLimited",
				message: "Too many requests. Try again later.",
				details: { retryAfterSeconds: 12 },
			},
		});
	});

	it("omits Retry-After when canonical timing is absent", () => {
		expect(
			jsonFailure(errorResult.fail("RATE_LIMITED")).headers.get("Retry-After"),
		).toBeNull();
		expect(
			jsonFailure(
				errorResult.fail("INTERNAL_ERROR", { correlationId: "c1" }),
			).headers.get("Retry-After"),
		).toBeNull();
	});

	it("preserves caller-provided headers", () => {
		const response = jsonFailure(errorResult.fail("UNAUTHORIZED"), {
			headers: { "Cache-Control": "no-store" },
		});

		expect(response.status).toBe(401);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});
