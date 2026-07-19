import { describe, expect, it } from "vitest";

import { jsonError } from "@/modules/platform/api/json-response";

describe("jsonError Retry-After", () => {
	it("sets Retry-After for valid details.retryAfter", async () => {
		const response = jsonError("RATE_LIMITED", "Too many requests.", {
			retryAfter: 30,
		});
		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("30");
		await expect(response.json()).resolves.toEqual({
			error: {
				code: "RATE_LIMITED",
				message: "Too many requests.",
				details: { retryAfter: 30 },
			},
		});
	});

	it("omits Retry-After when details are missing or invalid", () => {
		expect(
			jsonError("RATE_LIMITED", "Too many requests.").headers.get(
				"Retry-After",
			),
		).toBeNull();
		expect(
			jsonError("RATE_LIMITED", "Too many requests.", {
				retryAfter: 0,
			}).headers.get("Retry-After"),
		).toBeNull();
		expect(
			jsonError("INTERNAL_ERROR", "Boom.", { correlationId: "c1" }).headers.get(
				"Retry-After",
			),
		).toBeNull();
	});
});
