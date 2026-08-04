/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { describe, expect, it } from "vitest";
import { errorIngress } from "../../src/capabilities/ingress";
import { errorResult } from "../../src/capabilities/result";
import { errorWire } from "../../src/capabilities/wire";
import { ERROR_LIMITS } from "../../src/contract/bounds";
import { readFailureRecord } from "../../src/failure/identity";
import type { Failure } from "../../src/failure/types";
import type { ResultFailure } from "../../src/public-types";
import { utf8ByteLength } from "../../src/security/normalize";
import { boundedWireSnapshot } from "../../src/wire/schema";

function publicData(input: unknown) {
	return errorWire.serialize(errorWire.deserialize(input)).error;
}

describe("errorWire", () => {
	it("round-trips every canonical result without changing public data", () => {
		const retryAfterSeconds = errorResult.retryAfterSeconds(30);
		const results = [
			errorResult.fail("BAD_REQUEST", {
				publicMessage: "The submitted request was invalid",
			}),
			errorResult.fail("UNAUTHORIZED"),
			errorResult.fail("FORBIDDEN"),
			errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested invoice was not found",
			}),
			errorResult.fail("CONFLICT", {
				publicMessage: "The invoice is no longer editable",
			}),
			errorResult.fail("CONCURRENCY_CONFLICT"),
			errorResult.fail("VALIDATION_ERROR", {
				fieldErrors: { email: ["Enter a valid email address"] },
				publicMessage: "Review the highlighted fields",
			}),
			errorResult.fail("RATE_LIMITED", { retryAfterSeconds }),
			errorResult.fail("INTERNAL_ERROR", { correlationId: "trace-123" }),
			errorResult.fail("SERVICE_UNAVAILABLE"),
		] as const;

		for (const result of results) {
			const envelope = errorWire.serialize(result);
			expect(
				errorWire.serialize(errorWire.deserialize(envelope)).error,
			).toEqual(envelope.error);
		}
	});

	it("serializes opaque failures and assigns deserialized failures package context", () => {
		const failure = errorIngress.code("NOT_FOUND", {
			operation: "invoice.read",
			publicMessage: "The requested invoice was not found",
		});
		const result = errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested invoice was not found",
		});
		const envelope = errorWire.serialize(failure);
		const deserialized = errorWire.deserialize(envelope);

		expect(envelope).toEqual({
			error: {
				code: "NOT_FOUND",
				message: "The requested invoice was not found",
				messageKey: "errors.notFound",
			},
			schema: "afenda.failure/v1",
		});
		expect(envelope).toEqual(errorWire.serialize(result));
		expect(readFailureRecord(deserialized).context.operation).toBe(
			"errors.wire.deserialize",
		);
	});

	it("normalizes structural results instead of trusting their copy", () => {
		const forgedCopy = Object.freeze({
			code: "FORBIDDEN",
			message: "password=do-not-emit",
			messageKey: "errors.forbidden",
			ok: false,
		}) satisfies ResultFailure<"FORBIDDEN">;

		expect(errorWire.serialize(forgedCopy).error).toEqual({
			code: "FORBIDDEN",
			message: "The operation is not permitted",
			messageKey: "errors.forbidden",
		});
	});

	it("throws one fixed error for malformed structural serialization input", () => {
		const malformed = {
			code: "CONFLICT",
			message: "Conflict",
			messageKey: "errors.notFound",
			ok: false,
		};

		expect(() =>
			Reflect.apply(errorWire.serialize, undefined, [malformed]),
		).toThrow(
			new TypeError("Wire serialization requires a canonical failure."),
		);
	});

	it("reads the retained legacy flat value and canonicalizes retryAfter", () => {
		expect(
			publicData({
				code: "RATE_LIMITED",
				details: { retryAfter: 45 },
				message: "untrusted copy",
			}),
		).toEqual({
			code: "RATE_LIMITED",
			details: { retryAfterSeconds: 45 },
			message: "Too many requests. Try again later.",
			messageKey: "errors.rateLimited",
		});
	});

	it("rejects ambiguous legacy timing and the legacy key in v1", () => {
		for (const input of [
			{
				code: "RATE_LIMITED",
				details: { retryAfter: 10, retryAfterSeconds: 10 },
				message: "limited",
			},
			{
				error: {
					code: "RATE_LIMITED",
					details: { retryAfter: 10 },
					message: "limited",
					messageKey: "errors.rateLimited",
				},
				schema: "afenda.failure/v1",
			},
		]) {
			expect(publicData(input).code).toBe("INTERNAL_ERROR");
		}
	});

	it("rejects reserved historical names and unknown schemas", () => {
		for (const input of [
			{ code: "INTERNAL", message: "legacy" },
			{
				error: {
					code: "NOT_FOUND",
					message: "missing",
					messageKey: "errors.notFound",
				},
				schema: "afenda.failure/v2",
			},
		]) {
			expect(publicData(input)).toMatchObject({
				code: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
				messageKey: "errors.internalError",
			});
		}
	});

	it("fails closed without invoking accessors", () => {
		let getterCalls = 0;
		const accessor = Object.defineProperty({}, "code", {
			enumerable: true,
			get() {
				getterCalls += 1;
				return "NOT_FOUND";
			},
		});

		expect(publicData(accessor).code).toBe("INTERNAL_ERROR");
		expect(getterCalls).toBe(0);
	});

	it("fails closed over proxies, cycles, non-plain values, and invalid primitives", () => {
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;
		const hostileProxy = new Proxy(
			{},
			{
				ownKeys() {
					throw new Error("hostile");
				},
			},
		);

		for (const input of [
			cycle,
			hostileProxy,
			new Date(),
			Number.POSITIVE_INFINITY,
			1n,
			undefined,
		]) {
			expect(() => publicData(input)).not.toThrow();
			expect(publicData(input).code).toBe("INTERNAL_ERROR");
		}
	});

	it("accepts every wire-work bound and rejects exactly one past it", () => {
		const nestContainers = (count: number): unknown => {
			let nested: unknown = "value";
			for (let index = 0; index < count; index += 1) {
				nested = { value: nested };
			}
			return nested;
		};
		const objectWithKeys = (count: number) =>
			Object.fromEntries(
				Array.from({ length: count }, (_, index) => [`key${index}`, index]),
			);
		const arrayWithItems = (count: number) =>
			Array.from({ length: count }, () => null);
		const atTotalArrayItemBudget = Array.from({ length: 5 }, () =>
			arrayWithItems(99),
		);
		const pastTotalArrayItemBudget = [
			...Array.from({ length: 4 }, () => arrayWithItems(99)),
			arrayWithItems(100),
		];
		const aggregateStringWork = Array.from(
			{ length: ERROR_LIMITS.fieldInputMessagesPerField },
			() => "x".repeat(Math.ceil(ERROR_LIMITS.wireBytes / 2)),
		);
		const emptyByteFixture = JSON.stringify({ payload: "" });
		const exactBytePayload = "x".repeat(
			ERROR_LIMITS.wireBytes - utf8ByteLength(emptyByteFixture),
		);

		expect(
			boundedWireSnapshot(nestContainers(ERROR_LIMITS.wireDepth)),
		).toBeDefined();
		expect(
			boundedWireSnapshot(nestContainers(ERROR_LIMITS.wireDepth + 1)),
		).toBeUndefined();
		expect(
			boundedWireSnapshot(objectWithKeys(ERROR_LIMITS.wireKeys)),
		).toBeDefined();
		expect(
			boundedWireSnapshot(objectWithKeys(ERROR_LIMITS.wireKeys + 1)),
		).toBeUndefined();
		expect(
			boundedWireSnapshot(
				arrayWithItems(ERROR_LIMITS.fieldInputMessagesPerField),
			),
		).toBeDefined();
		expect(
			boundedWireSnapshot(
				arrayWithItems(ERROR_LIMITS.fieldInputMessagesPerField + 1),
			),
		).toBeUndefined();
		expect(boundedWireSnapshot(atTotalArrayItemBudget)).toBeDefined();
		expect(boundedWireSnapshot(pastTotalArrayItemBudget)).toBeUndefined();

		let sharedArray: readonly unknown[] = [null];
		for (let depth = 1; depth < ERROR_LIMITS.wireDepth; depth += 1) {
			sharedArray = Array.from(
				{ length: ERROR_LIMITS.fieldInputMessagesPerField },
				() => sharedArray,
			);
		}
		expect(boundedWireSnapshot(sharedArray)).toBeUndefined();
		expect(boundedWireSnapshot(aggregateStringWork)).toBeUndefined();
		expect(boundedWireSnapshot({ payload: exactBytePayload })).toBeDefined();
		expect(
			boundedWireSnapshot({ payload: `${exactBytePayload}x` }),
		).toBeUndefined();
	});

	it("emits deeply frozen canonical envelopes", () => {
		const envelope = errorWire.serialize(
			errorResult.fail("VALIDATION_ERROR", {
				fieldErrors: { email: ["Enter a valid email"] },
				publicMessage: "Review the highlighted fields",
			}),
		);
		const { details } = envelope.error;

		expect(Object.isFrozen(envelope)).toBe(true);
		expect(Object.isFrozen(envelope.error)).toBe(true);
		expect(Object.isFrozen(details)).toBe(true);
		expect(Object.isFrozen(details.fieldErrors)).toBe(true);
		expect(Object.isFrozen(details.fieldErrors.email)).toBe(true);
	});

	it("does not trust an in-process Failure as wire input", () => {
		const localFailure: Failure<"FORBIDDEN"> = errorIngress.code("FORBIDDEN", {
			operation: "invoice.update",
		});
		expect(publicData(localFailure).code).toBe("INTERNAL_ERROR");
	});
});
