/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";
import { AppError } from "../src/core/app-error";
import { errorDiagnosticFields } from "../src/core/diagnostic";

describe("errorDiagnosticFields", () => {
	it("projects typed control metadata without raw messages or causes", () => {
		const fields = errorDiagnosticFields(
			new AppError({
				code: "SERVICE_UNAVAILABLE",
				message: "Database unavailable",
				retryable: true,
				cause: new Error("password=secret"),
			}),
		);

		expect(fields).toEqual({
			code: "SERVICE_UNAVAILABLE",
			isOperational: true,
			retryable: true,
		});
		expect(JSON.stringify(fields)).not.toMatch(
			/password|secret|cause|message/i,
		);
	});

	it("includes only a safe bounded operation label", () => {
		expect(
			errorDiagnosticFields(
				new AppError({
					code: "INTERNAL_ERROR",
					message: "hidden",
					operation: "  reconcile permission catalog  ",
				}),
			),
		).toEqual({
			code: "INTERNAL_ERROR",
			isOperational: false,
			operation: "reconcile permission catalog",
			retryable: false,
		});

		expect(
			errorDiagnosticFields(
				new AppError({
					code: "INTERNAL_ERROR",
					message: "hidden",
					operation: "DATABASE_URL=postgres://admin:secret@host/db",
				}),
			),
		).not.toHaveProperty("operation");
	});

	it("normalizes unknown values before projecting diagnostics", () => {
		expect(errorDiagnosticFields(new Error("DATABASE_URL=secret"))).toEqual({
			code: "INTERNAL_ERROR",
			isOperational: false,
			retryable: false,
		});
	});
});
