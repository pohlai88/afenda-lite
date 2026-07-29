/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import { AppError } from "../src/core/app-error";
import { normalizeUnknown } from "../src/core/normalize";

describe("normalizeUnknown", () => {
	it("preserves AppError instances", () => {
		const original = new AppError({
			code: "NOT_FOUND",
			message: "Record not found",
		});
		expect(normalizeUnknown(original)).toBe(original);
	});

	it("normalizes unknown values without leaking raw messages", () => {
		const source = new Error("password=secret");
		const normalized = normalizeUnknown(source);

		expect(normalized).toMatchObject({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
			isOperational: false,
			cause: source,
		});
	});

	it("uses a trimmed fallback message", () => {
		const normalized = normalizeUnknown(
			new Error("password=super-secret connection failed"),
			"  Request failed  ",
		);
		expect(normalized.code).toBe("INTERNAL_ERROR");
		expect(normalized.message).toBe("Request failed");
		expect(normalized.isOperational).toBe(false);
		expect(normalized.cause).toBeInstanceOf(Error);
	});

	it("uses the default for an empty fallback", () => {
		const normalized = normalizeUnknown(new Error("raw"), "   ");
		expect(normalized.message).toBe("An unexpected error occurred");
	});

	it("uses the default for a non-string runtime fallback", () => {
		const normalized = normalizeUnknown(new Error("raw"), 123);
		expect(normalized.message).toBe("An unexpected error occurred");
	});

	it("does not automatically interpret PostgreSQL-shaped values", () => {
		const source = { code: "23505" };
		const normalized = normalizeUnknown(source);

		expect(normalized).toMatchObject({
			code: "INTERNAL_ERROR",
			isOperational: false,
			cause: source,
		});
	});

	it("does not expose PostgreSQL-shaped raw messages", () => {
		const normalized = normalizeUnknown(
			{
				code: "23505",
				message: "duplicate key value violates unique constraint users_email",
			},
			"fallback",
		);
		expect(normalized.code).toBe("INTERNAL_ERROR");
		expect(normalized.message).toBe("fallback");
		expect(normalized.message).not.toMatch(/duplicate key/i);
	});
});
