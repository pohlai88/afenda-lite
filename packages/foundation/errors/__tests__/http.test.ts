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
} from "../src/http/index";

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

	it("drops unsafe public details", () => {
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
				message: "Failure.",
				details: { correlationId: "corr-1" },
			},
		});
	});

	it("uses historical aliases", () => {
		expect(API_ERROR_HTTP_STATUS).toBe(ERROR_HTTP_STATUS);
		expect(apiErrorBody("NOT_FOUND", "Missing.")).toEqual(
			httpErrorBody("NOT_FOUND", "Missing."),
		);
	});
});
