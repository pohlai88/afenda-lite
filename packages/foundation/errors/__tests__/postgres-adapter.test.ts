/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	hasPostgresSqlState,
	normalizePostgresUnknown,
	postgresSqlState,
} from "../src/adapters/postgres";
import { serializeAppError } from "../src/core/serialize";

describe("normalizePostgresUnknown", () => {
	it("maps 23505 to CONFLICT without SQL text in serialize", () => {
		const error = normalizePostgresUnknown({
			code: "23505",
			detail: "Key (email)=(a@b.com) already exists.",
			message: "duplicate key value violates unique constraint",
		});
		expect(error.code).toBe("CONFLICT");
		const serialized = serializeAppError(error);
		expect(serialized.message).toBe("A conflicting record already exists");
		expect(JSON.stringify(serialized)).not.toMatch(/duplicate key/i);
		expect(JSON.stringify(serialized)).not.toMatch(/Key \(email\)/i);
		expect(JSON.stringify(serialized)).not.toMatch(/a@b\.com/i);
		expect(serialized.details).toBeUndefined();
	});

	it("maps a unique violation to conflict", () => {
		const result = normalizePostgresUnknown({ code: "23505" });
		expect(result).toMatchObject({
			code: "CONFLICT",
			isOperational: true,
			details: undefined,
		});
	});

	it("maps foreign-key violations to a neutral conflict", () => {
		const error = normalizePostgresUnknown({
			message: "wrapper",
			cause: { code: "23503" },
		});
		expect(error.code).toBe("CONFLICT");
	});

	it("normalizes lowercase SQLSTATE values", () => {
		const error = normalizePostgresUnknown({ sqlState: "22p02" });
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.details).toBeUndefined();
	});

	it("marks retryable database conflicts", () => {
		const error = normalizePostgresUnknown({ code: "40001" });
		expect(error.code).toBe("CONFLICT");
		expect(error.isOperational).toBe(true);
		expect(error.retryable).toBe(true);
		expect(error.details).toBeUndefined();
	});

	it("reads retryable SQLSTATE from a deeply nested cause", () => {
		const result = normalizePostgresUnknown({
			cause: {
				cause: {
					code: "40001",
				},
			},
		});
		expect(result).toMatchObject({
			code: "CONFLICT",
			retryable: true,
		});
	});

	it("treats unknown SQLSTATE values as non-operational database failures", () => {
		const source = { code: "ZZ999" };
		const error = normalizePostgresUnknown(source);
		expect(error.code).toBe("INTERNAL_ERROR");
		expect(error.message).toBe("An unexpected error occurred");
		expect(error.isOperational).toBe(false);
		expect(error.details).toBeUndefined();
		expect(error.cause).toBe(source);
	});

	it("ignores hostile getters while reading duck-typed errors", () => {
		const error = normalizePostgresUnknown({
			get code() {
				throw new Error("unsafe getter");
			},
			cause: { code: "23505" },
		});
		expect(error.code).toBe("CONFLICT");
	});

	it("does not throw when a property getter throws without a fallback cause", () => {
		const source = Object.defineProperty({}, "code", {
			get() {
				throw new Error("getter failure");
			},
		});
		expect(() => normalizePostgresUnknown(source)).not.toThrow();
		expect(normalizePostgresUnknown(source).code).toBe("INTERNAL_ERROR");
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
		expect(normalizePostgresUnknown(source).code).toBe("INTERNAL_ERROR");
	});

	it("does not expose SQLSTATE in public details", () => {
		const result = normalizePostgresUnknown({ code: "40P01" });
		expect(result.retryable).toBe(true);
		expect(result.details).toBeUndefined();
	});

	it("marks database authentication failures as non-operational", () => {
		const result = normalizePostgresUnknown({ code: "28P01" });
		expect(result).toMatchObject({
			code: "SERVICE_UNAVAILABLE",
			isOperational: false,
			details: undefined,
		});
	});

	it("normalizes values without a SQLSTATE shape", () => {
		expect(normalizePostgresUnknown(new Error("boom")).code).toBe(
			"INTERNAL_ERROR",
		);
		expect(normalizePostgresUnknown({ code: "ENOENT" }).code).toBe(
			"INTERNAL_ERROR",
		);
	});

	it("exposes safe SQLSTATE discovery for boundary translators", () => {
		expect(postgresSqlState({ sqlState: "40p01" })).toBe("40P01");
		expect(postgresSqlState({ cause: { code: "23505" } })).toBe("23505");
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "23505")).toBe(true);
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "bad")).toBe(false);
		expect(hasPostgresSqlState({ sqlstate: "23505" }, "40001")).toBe(false);
	});

	it.each([
		["08006", "SERVICE_UNAVAILABLE"],
		["53300", "SERVICE_UNAVAILABLE"],
		["57P01", "SERVICE_UNAVAILABLE"],
		["55P03", "CONFLICT"],
	] as const)("maps retryable infrastructure SQLSTATE %s", (sqlState, code) => {
		const error = normalizePostgresUnknown({ code: sqlState });

		expect(error.code).toBe(code);
		expect(error.retryable).toBe(true);
		expect(error.details).toBeUndefined();
	});

	it("totally normalizes a non-PostgreSQL unknown", () => {
		const source = new Error("socket included a secret");
		const error = normalizePostgresUnknown(source);

		expect(error).toMatchObject({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
			isOperational: false,
			cause: source,
		});
	});
});
