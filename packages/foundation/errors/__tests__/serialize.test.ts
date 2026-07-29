/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import { rateLimited, serviceUnavailable } from "../src/common/index";
import { AppError } from "../src/core/app-error";
import { serializeAppError, serializeUnknown } from "../src/core/serialize";

describe("serializeAppError", () => {
	it("serializes a normal AppError", () => {
		const error = new AppError({
			code: "NOT_FOUND",
			message: "Record not found",
			details: { entity: "customer" },
		});

		expect(serializeAppError(error)).toEqual({
			code: "NOT_FOUND",
			message: "Record not found",
			details: { entity: "customer" },
		});
	});

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

	it("fails closed for throwing detail getters", () => {
		const error = new AppError({
			code: "INTERNAL_ERROR",
			message: "Operation failed",
		});

		Object.defineProperty(error, "details", {
			get() {
				throw new Error("getter failure");
			},
		});

		expect(() => serializeAppError(error)).not.toThrow();
		expect(serializeAppError(error)).toEqual({
			code: "INTERNAL_ERROR",
			message: "Operation failed",
		});
	});

	it("falls back for an invalid runtime code", () => {
		const error = {
			code: "INVALID",
			message: "Failure",
			isOperational: false,
		} as unknown as AppError;

		expect(serializeAppError(error)).toEqual({
			code: "INTERNAL_ERROR",
			message: "Failure",
		});
	});

	it("uses a safe message when the runtime message is blank", () => {
		const error = {
			code: "INTERNAL_ERROR",
			message: "   ",
			isOperational: false,
		} as unknown as AppError;

		expect(serializeAppError(error)).toEqual({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	});

	it("serializeUnknown routes through infrastructure-agnostic normalize", () => {
		const serialized = serializeUnknown(
			{
				code: "23505",
				message: "duplicate key value violates unique constraint",
			},
			"fallback",
		);
		expect(serialized.code).toBe("INTERNAL_ERROR");
		expect(serialized.message).toBe("fallback");
		expect(JSON.stringify(serialized)).not.toMatch(/duplicate key/i);
	});

	it("serializeUnknown uses a safe default fallback message", () => {
		expect(serializeUnknown(new Error("raw failure"))).toEqual({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	});

	it("serializeUnknown uses a safe default for non-string runtime fallback", () => {
		expect(serializeUnknown(new Error("raw failure"), 123)).toEqual({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
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
