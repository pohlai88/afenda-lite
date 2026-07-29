/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import { AppError } from "../src/core/app-error";
import {
	fail,
	failFromAppError,
	failFromUnknown,
	ok,
} from "../src/result/index";

describe("result helpers", () => {
	it("ok and fail preserve wire shape", () => {
		expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
		expect(fail("NOT_FOUND", "Missing", { id: "x" })).toEqual({
			ok: false,
			code: "NOT_FOUND",
			message: "Missing",
			details: { id: "x" },
		});
	});

	it("fail sanitizes unsafe details", () => {
		expect(
			fail("BAD_REQUEST", "Invalid", {
				field: "email",
				password: "secret",
				sql: "SELECT * FROM users",
			}),
		).toEqual({
			ok: false,
			code: "BAD_REQUEST",
			message: "Invalid",
			details: { field: "email" },
		});
	});

	it("fail omits non-record details", () => {
		expect(fail("INTERNAL_ERROR", "Failed", "unsafe")).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed",
		});
	});

	it("failFromAppError serializes AppError safely", () => {
		const result = failFromAppError(
			new AppError({
				code: "FORBIDDEN",
				message: "Denied",
				details: { token: "secret", reason: "role" },
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied",
			details: { reason: "role" },
		});
	});

	it("failFromUnknown never leaks raw Error.message", () => {
		const result = failFromUnknown(
			new Error("SELECT password FROM users"),
			"Operation failed",
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("INTERNAL_ERROR");
		expect(result.message).toBe("Operation failed");
		expect(result.message).not.toMatch(/SELECT/i);
	});

	it("failFromUnknown uses safe default for non-string runtime fallback", () => {
		const result = failFromUnknown(new Error("raw"), 123);
		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	});

	it("failFromUnknown serializes AppError safely", () => {
		const result = failFromUnknown(
			new AppError({
				code: "FORBIDDEN",
				message: "Denied",
				details: { token: "secret", reason: "role" },
			}),
			"fallback",
		);
		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied",
			details: { reason: "role" },
		});
	});
});
