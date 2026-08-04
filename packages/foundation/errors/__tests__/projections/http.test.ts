/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { describe, expect, it } from "vitest";
import { errorIngress, errorProject, errorResult } from "../../src/index";

describe("errorProject.http", () => {
	it("derives status, body, and headers from one canonical policy", () => {
		const retryAfterSeconds = errorResult.retryAfterSeconds(45);
		const projection = errorProject.http(
			errorIngress.code("RATE_LIMITED", {
				operation: "session.create",
				retryAfterSeconds,
			}),
		);

		expect(projection).toEqual({
			body: {
				error: {
					code: "RATE_LIMITED",
					details: { retryAfterSeconds: 45 },
					message: "Too many requests. Try again later.",
					messageKey: "errors.rateLimited",
				},
			},
			headers: { "Retry-After": "45" },
			status: 429,
		});
		expect(Object.isFrozen(projection)).toBe(true);
		expect(Object.isFrozen(projection.body)).toBe(true);
		expect(Object.isFrozen(projection.headers)).toBe(true);
	});

	it("validates public Result failures before projecting them", () => {
		expect(
			errorProject.http(
				errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested invoice was not found.",
				}),
			),
		).toEqual({
			body: {
				error: {
					code: "NOT_FOUND",
					message: "The requested invoice was not found.",
					messageKey: "errors.notFound",
				},
			},
			headers: {},
			status: 404,
		});

		expect(() =>
			Reflect.apply(errorProject.http, undefined, [
				{
					code: "FORBIDDEN",
					message: "Caller-controlled wording",
					messageKey: "errors.forbidden",
					ok: false,
				},
			]),
		).toThrow("HTTP projection requires a canonical failure.");
	});
});
