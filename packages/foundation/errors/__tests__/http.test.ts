/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	API_ERROR_HTTP_STATUS,
	apiErrorBody,
	ERROR_HTTP_STATUS,
	httpErrorBody,
	projectHttpError,
} from "../src/http/index";
import { internalError, rateLimited } from "../src/index";

describe("httpErrorBody", () => {
	it("builds a bare error body when details are absent", () => {
		expect(httpErrorBody("BAD_REQUEST", "Malformed JSON.")).toEqual({
			error: { code: "BAD_REQUEST", message: "Malformed JSON." },
		});
	});

	it("keeps safe details", () => {
		expect(
			httpErrorBody("VALIDATION_ERROR", "Invalid input.", {
				field: "email",
				retryAfter: 30,
				nested: { reason: "required" },
			}),
		).toEqual({
			error: {
				code: "VALIDATION_ERROR",
				message: "Invalid input.",
				details: {
					field: "email",
					retryAfter: 30,
					nested: { reason: "required" },
				},
			},
		});
	});

	it("fails closed for INTERNAL_ERROR messages and details", () => {
		expect(
			httpErrorBody("INTERNAL_ERROR", "Failure.", {
				correlationId: "corr-1",
				password: "secret",
				stack: "Error: boom",
				sql: "SELECT * FROM users",
				hint: "duplicate key value violates unique constraint",
			}),
		).toEqual({
			error: {
				code: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
			},
		});
	});

	it("uses historical aliases", () => {
		expect(API_ERROR_HTTP_STATUS).toBe(ERROR_HTTP_STATUS);
		expect(apiErrorBody("NOT_FOUND", "Missing.")).toEqual(
			httpErrorBody("NOT_FOUND", "Missing."),
		);
	});

	it("atomically projects status, body, and Retry-After", () => {
		expect(projectHttpError(rateLimited(45))).toEqual({
			status: 429,
			body: {
				error: {
					code: "RATE_LIMITED",
					message: "Too many requests. Try again later.",
					details: { retryAfter: 45 },
				},
			},
			retryAfter: 45,
		});
	});

	it("atomically fails closed for internal errors", () => {
		expect(projectHttpError(internalError("database password leaked"))).toEqual(
			{
				status: 500,
				body: {
					error: {
						code: "INTERNAL_ERROR",
						message: "An unexpected error occurred",
					},
				},
			},
		);
	});
});
