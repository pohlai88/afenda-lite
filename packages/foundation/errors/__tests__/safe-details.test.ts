/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import { sanitizeErrorDetails } from "../src/core/safe-details";

describe("sanitizeErrorDetails", () => {
	it("keeps bounded JSON-safe scalars and nested records", () => {
		expect(
			sanitizeErrorDetails({
				string: "value",
				number: 42,
				boolean: false,
				nil: null,
				list: ["a", 1, true, null],
				nested: { reason: "required" },
			}),
		).toEqual({
			string: "value",
			number: 42,
			boolean: false,
			nil: null,
			list: ["a", 1, true, null],
			nested: { reason: "required" },
		});
	});

	it("drops blocked keys and SQL-like strings", () => {
		expect(
			sanitizeErrorDetails({
				correlationId: "corr-1",
				accessToken: "secret",
				client_secret: "secret",
				setCookie: "sid=1",
				query: "SELECT * FROM users",
				hint: "duplicate key value violates unique constraint",
				nested: {
					privateKey: "secret",
					reason: "valid",
				},
			}),
		).toEqual({
			correlationId: "corr-1",
			nested: { reason: "valid" },
		});
	});

	it("drops non-finite numbers and unsupported values", () => {
		expect(
			sanitizeErrorDetails({
				valid: 1,
				nan: Number.NaN,
				infinity: Number.POSITIVE_INFINITY,
				fn: () => "unsafe",
				date: new Date("2026-07-29T00:00:00Z"),
			}),
		).toEqual({ valid: 1 });
	});

	it("truncates long strings and arrays", () => {
		const longString = "x".repeat(2_100);
		const values = Array.from({ length: 60 }, (_, index) => index);

		const result = sanitizeErrorDetails({ longString, values });

		expect(result?.longString).toBe("x".repeat(2_000));
		expect(result?.values).toEqual(values.slice(0, 50));
	});

	it("limits retained entries", () => {
		const details = Object.fromEntries(
			Array.from({ length: 60 }, (_, index) => [`key${index}`, index]),
		);

		const result = sanitizeErrorDetails(details);

		expect(Object.keys(result ?? {})).toHaveLength(50);
		expect(result).toHaveProperty("key0", 0);
		expect(result).not.toHaveProperty("key50");
	});

	it("stops at maximum depth", () => {
		const result = sanitizeErrorDetails({
			l1: { l2: { l3: { l4: { l5: { l6: "too deep" } } } } },
		});

		expect(result).toBeUndefined();
	});

	it("does not recurse through cycles", () => {
		const details: Record<string, unknown> = { id: "root" };
		details.self = details;

		expect(sanitizeErrorDetails(details)).toEqual({ id: "root" });
	});

	it("does not throw for throwing getters", () => {
		const details = Object.defineProperty({ safe: "value" }, "unsafe", {
			enumerable: true,
			get() {
				throw new Error("getter failure");
			},
		});

		expect(() => sanitizeErrorDetails(details)).not.toThrow();
		expect(sanitizeErrorDetails(details)).toEqual({ safe: "value" });
	});

	it("does not throw for hostile proxies", () => {
		const details = new Proxy(
			{},
			{
				getPrototypeOf() {
					throw new Error("proxy failure");
				},
			},
		);

		expect(() => sanitizeErrorDetails(details)).not.toThrow();
		expect(sanitizeErrorDetails(details)).toBeUndefined();
	});

	it("only accepts plain records as root and nested values", () => {
		class CustomDetails {
			id = "custom";
		}

		expect(sanitizeErrorDetails(new CustomDetails())).toBeUndefined();
		expect(
			sanitizeErrorDetails({ nested: new CustomDetails() }),
		).toBeUndefined();
		expect(sanitizeErrorDetails(["x"])).toBeUndefined();
	});
});
