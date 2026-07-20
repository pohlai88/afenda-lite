import { describe, expect, it } from "vitest";

import { AppError } from "../src/core/app-error";
import { fail, failFromUnknown, ok } from "../src/result/index";

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
