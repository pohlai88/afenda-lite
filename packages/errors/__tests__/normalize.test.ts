import { describe, expect, it } from "vitest";

import { AppError } from "../src/core/app-error";
import { normalizeUnknown } from "../src/core/normalize";

describe("normalizeUnknown", () => {
	it("passthrough AppError", () => {
		const original = new AppError({
			code: "NOT_FOUND",
			message: "Missing",
		});
		expect(normalizeUnknown(original, "fallback")).toBe(original);
	});

	it("does not promote raw Error.message to public message", () => {
		const normalized = normalizeUnknown(
			new Error("password=super-secret connection failed"),
			"Request failed",
		);
		expect(normalized.code).toBe("INTERNAL_ERROR");
		expect(normalized.message).toBe("Request failed");
		expect(normalized.isOperational).toBe(false);
		expect(normalized.cause).toBeInstanceOf(Error);
	});

	it("maps duck-typed Postgres SQLSTATE via adapter", () => {
		const normalized = normalizeUnknown(
			{
				code: "23505",
				message: "duplicate key value violates unique constraint users_email",
			},
			"fallback",
		);
		expect(normalized.code).toBe("CONFLICT");
		expect(normalized.message).toBe("A conflicting record already exists");
		expect(normalized.message).not.toMatch(/duplicate key/i);
	});
});
