import { describe, expect, it } from "vitest";

import { rateLimited, serviceUnavailable } from "../src/common/index";
import { AppError } from "../src/core/app-error";
import { serializeAppError, serializeUnknown } from "../src/core/serialize";

describe("serializeAppError", () => {
	it("emits code and message without cause or stack", () => {
		const error = new AppError({
			code: "INTERNAL_ERROR",
			message: "Safe fallback",
			cause: new Error("SELECT * FROM secrets WHERE token='abc'"),
			details: {
				correlationId: "corr-1",
				password: "leak",
				stack: "Error: boom\n    at foo",
				sql: "SELECT 1",
				cause: { nested: true },
			},
		});

		const serialized = serializeAppError(error);

		expect(serialized).toEqual({
			code: "INTERNAL_ERROR",
			message: "Safe fallback",
			details: { correlationId: "corr-1" },
		});
		expect(JSON.stringify(serialized)).not.toMatch(/SELECT/i);
		expect(JSON.stringify(serialized)).not.toMatch(/password/i);
		expect(JSON.stringify(serialized)).not.toMatch(/stack/i);
		expect(serialized).not.toHaveProperty("cause");
		expect(serialized).not.toHaveProperty("stack");
	});

	it("drops detail strings that look like SQL", () => {
		const error = new AppError({
			code: "CONFLICT",
			message: "Conflict",
			details: {
				hint: "duplicate key value violates unique constraint",
				retryable: false,
			},
		});

		expect(serializeAppError(error)).toEqual({
			code: "CONFLICT",
			message: "Conflict",
			details: { retryable: false },
		});
	});

	it("serializeUnknown routes through normalize (Postgres SQLSTATE)", () => {
		const serialized = serializeUnknown(
			{
				code: "23505",
				message: "duplicate key value violates unique constraint",
			},
			"fallback",
		);
		expect(serialized.code).toBe("CONFLICT");
		expect(serialized.message).toBe("A conflicting record already exists");
		expect(JSON.stringify(serialized)).not.toMatch(/duplicate key/i);
	});

	it("keeps retryAfter and service details through sanitize", () => {
		expect(serializeAppError(rateLimited(45)).details).toEqual({
			retryAfter: 45,
		});
		expect(serializeAppError(serviceUnavailable("db")).details).toEqual({
			service: "db",
		});
	});
});
