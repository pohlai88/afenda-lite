/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { describe, expect, it } from "vitest";
import {
	isTrustedFailure,
	readFailureRecord,
} from "../../src/failure/identity";
import { errorIngress } from "../../src/index";

describe("Lane 1 opaque Failure identity", () => {
	it("stores semantics in a private map behind an empty frozen identity", () => {
		const failure = errorIngress.code("CONFLICT", {
			correlationId: "trace-123",
			operation: "invoice.update",
			publicMessage: "The invoice is no longer editable",
		});
		const record = readFailureRecord(failure);

		expect(Object.keys(failure)).toEqual([]);
		expect(Object.isFrozen(failure)).toBe(true);
		expect(isTrustedFailure(failure)).toBe(true);
		expect(record).toMatchObject({
			code: "CONFLICT",
			context: {
				correlationId: "trace-123",
				operation: "invoice.update",
			},
			publicData: {
				code: "CONFLICT",
				message: "The invoice is no longer editable",
				messageKey: "errors.conflict",
			},
		});
		expect(record.publicData).not.toHaveProperty("details");
	});

	it("projects context correlation publicly only for INTERNAL_ERROR", () => {
		const failure = errorIngress.code("INTERNAL_ERROR", {
			correlationId: "trace-123",
			operation: "invoice.create",
		});
		expect(readFailureRecord(failure).publicData).toEqual({
			code: "INTERNAL_ERROR",
			details: { correlationId: "trace-123" },
			message: "An unexpected error occurred",
			messageKey: "errors.internalError",
		});
	});

	it("normalizes a stateful correlation getter exactly once", () => {
		let reads = 0;
		const input = {
			get correlationId() {
				reads += 1;
				return reads === 1 ? "trace-first" : "trace-second";
			},
			operation: "invoice.create",
		};
		const record = readFailureRecord(
			errorIngress.code("INTERNAL_ERROR", input),
		);

		expect(reads).toBe(1);
		expect(record.context.correlationId).toBe("trace-first");
		expect(record.publicData.details?.correlationId).toBe("trace-first");
	});

	it("returns a trusted package-created Failure unchanged from unknown ingress", () => {
		const failure = errorIngress.code("CONCURRENCY_CONFLICT", {
			operation: "invoice.update",
		});
		expect(errorIngress.unknown(failure, { operation: "invoice.catch" })).toBe(
			failure,
		);
	});

	it("normalizes every untrusted value to a safe INTERNAL_ERROR", () => {
		const source = new Error("SELECT password FROM users");
		const failure = errorIngress.unknown(source, {
			correlationId: "trace-123",
			operation: "invoice.create",
		});
		const record = readFailureRecord(failure);

		expect(failure).not.toBe(source);
		expect(record.code).toBe("INTERNAL_ERROR");
		expect(record.publicData).toEqual({
			code: "INTERNAL_ERROR",
			details: { correlationId: "trace-123" },
			message: "An unexpected error occurred",
			messageKey: "errors.internalError",
		});
		expect(JSON.stringify(record)).not.toMatch(/SELECT|password/u);
	});

	it("rejects structural forgeries without reading their properties", () => {
		let reads = 0;
		const forged = Object.defineProperty({}, "code", {
			get() {
				reads += 1;
				return "CONFLICT";
			},
		});
		const normalized = errorIngress.unknown(forged, {
			operation: "invoice.catch",
		});

		expect(isTrustedFailure(forged)).toBe(false);
		expect(normalized).not.toBe(forged);
		expect(readFailureRecord(normalized).code).toBe("INTERNAL_ERROR");
		expect(reads).toBe(0);
	});

	it("normalizes invalid context without exposing another correlation source", () => {
		const failure = errorIngress.code("INTERNAL_ERROR", {
			correlationId: "invalid correlation",
			operation: "invalid operation",
		});
		const record = readFailureRecord(failure);

		expect(record.context).toEqual({ operation: "unknown" });
		expect(record.publicData).not.toHaveProperty("details");
	});

	it("exposes only completed frozen ingress capabilities", () => {
		expect(errorIngress).toHaveProperty("postgres", expect.any(Function));
		expect(Object.isFrozen(errorIngress)).toBe(true);
	});
});
