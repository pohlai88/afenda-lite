/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	AppError,
	isAppError,
	isOperationalError,
} from "../src/core/app-error";

describe("AppError", () => {
	it("constructs an operational error by default", () => {
		const error = new AppError({
			code: "BAD_REQUEST",
			message: "Invalid request",
		});

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error.name).toBe("AppError");
		expect(error.code).toBe("BAD_REQUEST");
		expect(error.isOperational).toBe(true);
	});

	it("preserves the native cause", () => {
		const cause = new Error("database failure");
		const error = new AppError({
			code: "INTERNAL_ERROR",
			message: "Unable to complete operation",
			isOperational: false,
			cause,
		});

		expect(error.cause).toBe(cause);
	});

	it("recognizes a normal AppError instance", () => {
		const error = new AppError({
			code: "NOT_FOUND",
			message: "Record not found",
		});

		expect(isAppError(error)).toBe(true);
	});

	it("recognizes a compatible cross-package error", () => {
		const marker = Symbol.for("@afenda/errors/AppError");
		const error = {
			[marker]: true,
			name: "AppError",
			message: "Record not found",
			code: "NOT_FOUND",
			isOperational: true,
			details: undefined,
		};

		expect(isAppError(error)).toBe(true);
	});

	it("rejects an incomplete marked object", () => {
		const marker = Symbol.for("@afenda/errors/AppError");

		expect(
			isAppError({
				[marker]: true,
				name: "AppError",
			}),
		).toBe(false);
	});

	it("rejects a marked object with an invalid code", () => {
		const marker = Symbol.for("@afenda/errors/AppError");

		expect(
			isAppError({
				[marker]: true,
				name: "AppError",
				message: "Invalid",
				code: "WHATEVER",
				isOperational: true,
			}),
		).toBe(false);
	});

	it("does not throw for hostile getters", () => {
		const value = Object.defineProperty({}, "name", {
			get() {
				throw new Error("getter failure");
			},
		});

		expect(() => isAppError(value)).not.toThrow();
		expect(isAppError(value)).toBe(false);
	});

	it("reads structural properties once while checking compatibility", () => {
		const marker = Symbol.for("@afenda/errors/AppError");
		let codeReads = 0;
		const value = {
			[marker]: true,
			name: "AppError",
			message: "Record not found",
			isOperational: true,
			get code() {
				codeReads += 1;
				return "NOT_FOUND";
			},
		};

		expect(isAppError(value)).toBe(true);
		expect(codeReads).toBe(1);
	});

	it("identifies operational errors", () => {
		expect(
			isOperationalError(
				new AppError({
					code: "CONFLICT",
					message: "Conflict",
					isOperational: true,
				}),
			),
		).toBe(true);

		expect(
			isOperationalError(
				new AppError({
					code: "INTERNAL_ERROR",
					message: "Failure",
					isOperational: false,
				}),
			),
		).toBe(false);
	});

	it("identifies compatible cross-package operational errors", () => {
		const marker = Symbol.for("@afenda/errors/AppError");

		expect(
			isOperationalError({
				[marker]: true,
				name: "AppError",
				message: "Conflict",
				code: "CONFLICT",
				isOperational: true,
			}),
		).toBe(true);
	});
});
