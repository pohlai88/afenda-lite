/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";
import {
	CANONICAL_ERROR_CODES,
	ERROR_REGISTRY,
} from "../../src/contract/registry";
import { errorIngress, errorProject, errorResult } from "../../src/index";

describe("Lane 1 retry projection", () => {
	it("is frozen and follows registry policy for every canonical code", () => {
		expect(Object.isFrozen(errorProject)).toBe(true);
		for (const code of CANONICAL_ERROR_CODES) {
			const disposition = Reflect.apply(errorProject.retry, undefined, [
				{ code, message: "Public", messageKey: "errors.fixture", ok: false },
			]);
			expect(disposition).toEqual({
				retryable: ERROR_REGISTRY[code].retry.retryable,
			});
			expect(Object.isFrozen(disposition)).toBe(true);

			const timedDisposition = Reflect.apply(errorProject.retry, undefined, [
				{
					code,
					details: { retryAfterSeconds: 60 },
					message: "Public",
					messageKey: "errors.fixture",
					ok: false,
				},
			]);
			expect(timedDisposition).toEqual(
				ERROR_REGISTRY[code].retry.retryAfter === "details.retryAfterSeconds"
					? { retryable: true, retryAfterSeconds: 60 }
					: { retryable: ERROR_REGISTRY[code].retry.retryable },
			);
		}
	});

	it("carries only a bounded occurrence delay from public Result details", () => {
		const disposition = errorProject.retry(
			errorResult.fail("RATE_LIMITED", {
				retryAfterSeconds: errorResult.retryAfterSeconds(45),
			}),
		);

		expect(disposition).toEqual({
			retryable: true,
			retryAfterSeconds: 45,
		});
		expect(Object.isFrozen(disposition)).toBe(true);
		expect(errorProject.retry(errorResult.fail("RATE_LIMITED"))).toEqual({
			retryable: true,
		});
		for (const retryAfterSeconds of [0, 86_401]) {
			expect(
				Reflect.apply(errorProject.retry, undefined, [
					{
						code: "RATE_LIMITED",
						details: { retryAfterSeconds },
						ok: false,
					},
				]),
			).toEqual({ retryable: true });
		}
	});

	it("projects opaque Failure without exposing its private record", () => {
		const failure = errorIngress.code("RATE_LIMITED", {
			correlationId: "trace-123",
			operation: "invoice.retry",
			retryAfterSeconds: errorResult.retryAfterSeconds(30),
		});

		expect(errorProject.retry(failure)).toEqual({
			retryable: true,
			retryAfterSeconds: 30,
		});
		expect(Object.keys(failure)).toEqual([]);
	});

	it("ignores occurrence delays when registry policy is non-retryable", () => {
		const disposition = Reflect.apply(errorProject.retry, undefined, [
			{
				code: "FORBIDDEN",
				details: { retryAfterSeconds: 60 },
				message: "The operation is not permitted",
				messageKey: "errors.forbidden",
				ok: false,
			},
		]);

		expect(disposition).toEqual({ retryable: false });
		expect(Object.isFrozen(disposition)).toBe(true);
	});

	it("rejects non-canonical structural input", () => {
		expect(() =>
			Reflect.apply(errorProject.retry, undefined, [
				{ code: "UNKNOWN_ERROR", ok: false },
			]),
		).toThrow("Retry projection requires a canonical failure.");
		expect(() =>
			Reflect.apply(errorProject.retry, undefined, [
				{ code: "SERVICE_UNAVAILABLE", ok: true },
			]),
		).toThrow("Retry projection requires a canonical failure.");
	});
});
