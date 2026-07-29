/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	fromPostgresUnknown,
	hasPostgresSqlState,
	postgresSqlState,
} from "../src/adapters/postgres";
import { serializeAppError } from "../src/core/serialize";

describe("fromPostgresUnknown", () => {
	it("maps 23505 to CONFLICT without SQL text in serialize", () => {
		const error = fromPostgresUnknown({
			code: "23505",
			detail: "Key (email)=(a@b.com) already exists.",
			message: "duplicate key value violates unique constraint",
		});
		expect(error).toBeDefined();
		if (error === undefined) {
			throw new Error("expected AppError");
		}
		expect(error.code).toBe("CONFLICT");
		const serialized = serializeAppError(error);
		expect(serialized.message).toBe("A conflicting record already exists");
		expect(JSON.stringify(serialized)).not.toMatch(/duplicate key/i);
		expect(JSON.stringify(serialized)).not.toMatch(/Key \(email\)/i);
		expect(JSON.stringify(serialized)).not.toMatch(/a@b\.com/i);
		expect(serialized.details).toBeUndefined();
	});

	it("maps a unique violation to conflict", () => {
		const result = fromPostgresUnknown({ code: "23505" });
		expect(result).toMatchObject({
			code: "CONFLICT",
			isOperational: true,
			details: undefined,
		});
	});

	it("reads SQLSTATE from nested cause", () => {
		const error = fromPostgresUnknown({
			message: "wrapper",
			cause: { code: "23503" },
		});
		expect(error?.code).toBe("BAD_REQUEST");
	});

	it("normalizes lowercase SQLSTATE values", () => {
		const error = fromPostgresUnknown({ sqlState: "22p02" });
		expect(error?.code).toBe("VALIDATION_ERROR");
		expect(error?.details).toBeUndefined();
	});

	it("marks retryable database conflicts", () => {
		const error = fromPostgresUnknown({ code: "40001" });
		expect(error?.code).toBe("CONFLICT");
		expect(error?.isOperational).toBe(true);
		expect(error?.details).toEqual({ retryable: true });
	});

	it("reads retryable SQLSTATE from a deeply nested cause", () => {
		const result = fromPostgresUnknown({
			cause: {
				cause: {
					code: "40001",
				},
			},
		});
		expect(result).toMatchObject({
			code: "CONFLICT",
			details: { retryable: true },
		});
	});

	it("treats unknown SQLSTATE values as non-operational database failures", () => {
		const source = { code: "ZZ999" };
		const error = fromPostgresUnknown(source);
		expect(error?.code).toBe("INTERNAL_ERROR");
		expect(error?.message).toBe("A database error occurred");
		expect(error?.isOperational).toBe(false);
		expect(error?.details).toBeUndefined();
		expect(error?.cause).toBe(source);
	});

	it("ignores hostile getters while reading duck-typed errors", () => {
		const error = fromPostgresUnknown({
			get code() {
				throw new Error("unsafe getter");
			},
			cause: { code: "23505" },
		});
		expect(error?.code).toBe("CONFLICT");
	});

	it("does not throw when a property getter throws without a fallback cause", () => {
		const source = Object.defineProperty({}, "code", {
			get() {
				throw new Error("getter failure");
			},
		});
		expect(() => fromPostgresUnknown(source)).not.toThrow();
		expect(fromPostgresUnknown(source)).toBeUndefined();
	});

	it("stops traversing deeply nested causes", () => {
		const source = {
			cause: {
				cause: {
					cause: {
						cause: {
							cause: {
								cause: { code: "23505" },
							},
						},
					},
				},
			},
		};
		expect(fromPostgresUnknown(source)).toBeUndefined();
	});

	it("does not expose SQLSTATE in public details", () => {
		const result = fromPostgresUnknown({ code: "40P01" });
		expect(result?.details).toEqual({ retryable: true });
		expect(result?.details).not.toHaveProperty("sqlState");
	});

	it("marks database authentication failures as non-operational", () => {
		const result = fromPostgresUnknown({ code: "28P01" });
		expect(result).toMatchObject({
			code: "SERVICE_UNAVAILABLE",
			isOperational: false,
			details: undefined,
		});
	});

	it("returns undefined when not a SQLSTATE shape", () => {
		expect(fromPostgresUnknown(new Error("boom"))).toBeUndefined();
		expect(fromPostgresUnknown({ code: "ENOENT" })).toBeUndefined();
	});

	it("exposes safe SQLSTATE discovery for boundary translators", () => {
		expect(postgresSqlState({ sqlState: "40p01" })).toBe("40P01");
		expect(postgresSqlState({ cause: { code: "23505" } })).toBe("23505");
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "23505")).toBe(true);
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "bad")).toBe(false);
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "40001")).toBe(false);
	});
});
