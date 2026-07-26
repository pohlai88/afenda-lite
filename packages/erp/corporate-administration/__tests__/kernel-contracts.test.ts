import { describe, expect, it } from "vitest";

import {
	commandFingerprintSchema,
	idempotencyKeySchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../src/kernel/brands";
import {
	canonicalDateSchema,
	compareCanonicalDates,
} from "../src/kernel/dates";
import {
	canonicalDecimalSchema,
	normalizeDecimalString,
} from "../src/kernel/decimals";
import {
	effectiveRangeSchema,
	effectiveRangesOverlap,
	isDateInEffectiveRange,
} from "../src/kernel/effective-range";
import {
	canonicalJsonStringify,
	createCanonicalFingerprint,
} from "../src/kernel/fingerprint";
import { normalizeCorporateAdministrationCode } from "../src/kernel/normalization";
import {
	cursorPaginationSchema,
	DEFAULT_CURSOR_PAGE_SIZE,
	MAX_CURSOR_PAGE_SIZE,
	opaqueCursorSchema,
} from "../src/kernel/pagination";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

describe("Corporate Administration kernel contracts", () => {
	it("constructs owned UUID brands only from valid UUIDs", () => {
		expect(legalCompanyIdSchema.parse(UUID_A)).toBe(UUID_A);
		expect(legalEstablishmentIdSchema.parse(UUID_B)).toBe(UUID_B);
		expect(legalCompanyIdSchema.safeParse("company-1").success).toBe(false);
		expect(legalEstablishmentIdSchema.safeParse("").success).toBe(false);
	});

	it("validates and normalizes trusted context and opaque identifiers", () => {
		expect(organizationIdSchema.parse(" org-1 ")).toBe("org-1");
		expect(userIdSchema.parse(" user-1 ")).toBe("user-1");
		expect(idempotencyKeySchema.parse(" request-1 ")).toBe("request-1");
		expect(organizationIdSchema.safeParse("   ").success).toBe(false);
		expect(commandFingerprintSchema.safeParse("ABC").success).toBe(false);
		expect(commandFingerprintSchema.safeParse("a".repeat(64)).success).toBe(
			true,
		);
	});

	it("accepts only strict real-calendar YYYY-MM-DD dates", () => {
		const leapDay = canonicalDateSchema.parse("2024-02-29");
		const nextDay = canonicalDateSchema.parse("2024-03-01");

		expect(compareCanonicalDates(leapDay, nextDay)).toBe(-1);
		expect(compareCanonicalDates(leapDay, leapDay)).toBe(0);
		for (const invalid of [
			"2023-02-29",
			"2024-02-30",
			"2024-13-01",
			"0000-01-01",
			"2024-2-01",
			"2024-01-01T00:00:00Z",
		]) {
			expect(canonicalDateSchema.safeParse(invalid).success).toBe(false);
		}
	});

	it("normalizes arbitrary-precision decimals without floating-point conversion", () => {
		expect(normalizeDecimalString("000123.45000")).toBe("123.45");
		expect(normalizeDecimalString("-000.1000")).toBe("-0.1");
		expect(normalizeDecimalString("-000.000")).toBe("0");
		expect(normalizeDecimalString("90071992547409931234567890.0100")).toBe(
			"90071992547409931234567890.01",
		);
		expect(canonicalDecimalSchema.safeParse("001.2").success).toBe(false);
		for (const invalid of ["1e3", "+1", ".5", "1.", "NaN", "Infinity"]) {
			expect(() => normalizeDecimalString(invalid)).toThrow(RangeError);
		}
	});

	it("normalizes codes to an uppercase comparison value", () => {
		expect(normalizeCorporateAdministrationCode("  ab.c-1_x  ")).toEqual({
			code: "ab.c-1_x",
			normalizedCode: "AB.C-1_X",
		});
		expect(() => normalizeCorporateAdministrationCode(" ")).toThrow(RangeError);
		expect(() => normalizeCorporateAdministrationCode("a".repeat(65))).toThrow(
			RangeError,
		);
		expect(() =>
			normalizeCorporateAdministrationCode("not allowed!"),
		).toThrow();
	});

	it("uses half-open effective ranges with nullable open ends", () => {
		const first = effectiveRangeSchema.parse({
			from: "2024-01-01",
			to: "2024-02-01",
		});
		const adjacent = effectiveRangeSchema.parse({
			from: "2024-02-01",
			to: "2024-03-01",
		});
		const overlapping = effectiveRangeSchema.parse({
			from: "2024-01-31",
			to: null,
		});

		expect(effectiveRangesOverlap(first, adjacent)).toBe(false);
		expect(effectiveRangesOverlap(first, overlapping)).toBe(true);
		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2024-01-31"), first),
		).toBe(true);
		expect(
			isDateInEffectiveRange(canonicalDateSchema.parse("2024-02-01"), first),
		).toBe(false);
		expect(
			effectiveRangeSchema.safeParse({
				from: "2024-02-01",
				to: "2024-02-01",
			}).success,
		).toBe(false);
	});

	it("applies bounded opaque cursor pagination defaults", () => {
		expect(cursorPaginationSchema.parse({})).toEqual({
			limit: DEFAULT_CURSOR_PAGE_SIZE,
		});
		expect(
			cursorPaginationSchema.parse({ cursor: " token ", limit: 100 }),
		).toEqual({
			cursor: "token",
			limit: MAX_CURSOR_PAGE_SIZE,
		});
		expect(cursorPaginationSchema.safeParse({ limit: 0 }).success).toBe(false);
		expect(cursorPaginationSchema.safeParse({ limit: 101 }).success).toBe(
			false,
		);
		expect(cursorPaginationSchema.safeParse({ limit: 1.5 }).success).toBe(
			false,
		);
		expect(opaqueCursorSchema.safeParse("   ").success).toBe(false);
	});

	it("canonicalizes JSON deterministically and produces a fixed SHA-256 vector", () => {
		const left = { b: [true, null, "x"], a: 1 } as const;
		const right = { a: 1, b: [true, null, "x"] } as const;
		const serialized = '{"a":1,"b":[true,null,"x"]}';
		const digest =
			"eca8cfb31ab74533e1eb2f4c74d2d55dfe3c79ac704787e54be8647ea7777eb1";

		expect(canonicalJsonStringify(left)).toBe(serialized);
		expect(canonicalJsonStringify(right)).toBe(serialized);
		expect(createCanonicalFingerprint(left)).toBe(digest);
		expect(createCanonicalFingerprint(right)).toBe(digest);
	});

	it("rejects unsupported, non-finite, non-plain and cyclic canonical JSON", () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;

		for (const invalid of [
			{ missing: undefined },
			{ number: Number.NaN },
			{ number: Number.POSITIVE_INFINITY },
			{ bigint: 1n },
			new Date(),
			cyclic,
		]) {
			expect(() =>
				Reflect.apply(canonicalJsonStringify, undefined, [invalid]),
			).toThrow(TypeError);
		}
	});
});
