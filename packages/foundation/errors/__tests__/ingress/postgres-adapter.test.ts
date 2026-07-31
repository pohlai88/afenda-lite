/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import { readFailureRecord } from "../../src/failure/identity";
import {
	errorIngress,
	errorProject,
	errorWire,
	type Failure,
} from "../../src/index";

type ExpectedPostgresFailure = Failure<
	"CONFLICT" | "CONCURRENCY_CONFLICT" | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE"
>;

const CONTEXT = Object.freeze({ operation: "invoice.persist" });

describe("errorIngress.postgres", () => {
	it("exposes exactly the reviewed PostgreSQL failure union", () => {
		const failure = errorIngress.postgres({ code: "23505" }, CONTEXT);

		expectTypeOf(failure).toEqualTypeOf<ExpectedPostgresFailure>();
	});

	it.each([
		["23505", "CONFLICT", false],
		["40001", "CONCURRENCY_CONFLICT", true],
		["40P01", "CONCURRENCY_CONFLICT", true],
		["55P03", "CONCURRENCY_CONFLICT", true],
		["08006", "SERVICE_UNAVAILABLE", true],
		["53300", "SERVICE_UNAVAILABLE", true],
		["57P01", "SERVICE_UNAVAILABLE", true],
		["57P02", "SERVICE_UNAVAILABLE", true],
		["57P03", "SERVICE_UNAVAILABLE", true],
	] as const)("maps reviewed SQLSTATE %s to %s", (sqlState, expectedCode, expectedRetryable) => {
		const failure = errorIngress.postgres({ code: sqlState }, CONTEXT);
		const envelope = errorWire.serialize(failure);

		expect(envelope.error.code).toBe(expectedCode);
		expect(errorProject.retry(failure).retryable).toBe(expectedRetryable);
		expect(JSON.stringify(envelope)).not.toContain(sqlState);
	});

	it.each([
		"08001",
		"23502",
		"23503",
		"23514",
		"22P02",
		"28000",
		"28P01",
		"53000",
		"57P04",
		"XX000",
		"ZZ999",
	] as const)("internalizes unreviewed SQLSTATE %s", (sqlState) => {
		const failure = errorIngress.postgres({ code: sqlState }, CONTEXT);
		const envelope = errorWire.serialize(failure);

		expect(envelope.error).toMatchObject({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
		expect(errorProject.retry(failure).retryable).toBe(false);
	});

	it("discovers lowercase SQLSTATE through bounded nested causes", () => {
		const failure = errorIngress.postgres(
			{ cause: { cause: { sqlState: "40p01" } } },
			CONTEXT,
		);

		expect(errorWire.serialize(failure).error.code).toBe(
			"CONCURRENCY_CONFLICT",
		);
	});

	it("records only closed package-owned PostgreSQL diagnostics", () => {
		const failure = errorIngress.postgres({ code: "40001" }, CONTEXT);
		const record = readFailureRecord(failure);

		expect(record.privateDiagnostics).toEqual({
			source: "postgres",
			sqlState: "40001",
		});
		expect(Object.isFrozen(record.privateDiagnostics)).toBe(true);
		expect(record.context.operation).toBe(CONTEXT.operation);
	});

	it("does not retain PostgreSQL metadata for an unknown shape", () => {
		const failure = errorIngress.postgres(
			new Error("socket included a secret"),
			CONTEXT,
		);
		const record = readFailureRecord(failure);

		expect(record.privateDiagnostics).toBeUndefined();
		expect(errorWire.serialize(failure).error.code).toBe("INTERNAL_ERROR");
	});

	it("ignores hostile accessors and continues through a safe cause", () => {
		const source = {
			get code() {
				throw new Error("unsafe getter");
			},
			cause: { code: "23505" },
		};

		expect(
			errorWire.serialize(errorIngress.postgres(source, CONTEXT)).error.code,
		).toBe("CONFLICT");
	});

	it("stops traversing causes beyond the owned depth bound", () => {
		const source = {
			cause: {
				cause: {
					cause: {
						cause: { cause: { code: "23505" } },
					},
				},
			},
		};

		expect(
			errorWire.serialize(errorIngress.postgres(source, CONTEXT)).error.code,
		).toBe("INTERNAL_ERROR");
	});
});
