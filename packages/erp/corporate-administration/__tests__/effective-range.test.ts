import { describe, expect, it } from "vitest";

import {
	appointmentEffectiveRange,
	assertValidEffectiveDateRange,
	effectiveRangesOverlap,
	filterEffectiveAsOf,
	hasOverlappingRange,
	InvalidEffectiveDateRangeError,
	isEffectiveOnDate,
	isInvalidEffectiveDateRange,
	OPEN_EFFECTIVE_TO_SENTINEL,
} from "../src/shared/effective-range";

describe("@afenda/corporate-administration shared/effective-range", () => {
	describe("isEffectiveOnDate", () => {
		it("returns true for an open-ended range on and after the start date", () => {
			expect(
				isEffectiveOnDate(
					{ effectiveFrom: "2024-01-01", effectiveTo: null },
					"2024-06-01",
				),
			).toBe(true);
		});

		it("returns false before the start date", () => {
			expect(
				isEffectiveOnDate(
					{ effectiveFrom: "2024-01-01", effectiveTo: null },
					"2023-12-31",
				),
			).toBe(false);
		});

		it("returns true on the inclusive start date", () => {
			expect(
				isEffectiveOnDate(
					{ effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31" },
					"2024-01-01",
				),
			).toBe(true);
		});

		it("returns false on the exclusive end date", () => {
			expect(
				isEffectiveOnDate(
					{ effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31" },
					"2024-12-31",
				),
			).toBe(false);
		});

		it("returns false after the end date", () => {
			expect(
				isEffectiveOnDate(
					{ effectiveFrom: "2024-01-01", effectiveTo: "2024-12-31" },
					"2025-01-01",
				),
			).toBe(false);
		});
	});

	describe("effectiveRangesOverlap", () => {
		it("returns false for adjacent half-open ranges", () => {
			expect(
				effectiveRangesOverlap(
					{ effectiveFrom: "2024-01-01", effectiveTo: "2024-06-01" },
					{ effectiveFrom: "2024-06-01", effectiveTo: null },
				),
			).toBe(false);
		});

		it("returns true when ranges share effective days", () => {
			expect(
				effectiveRangesOverlap(
					{ effectiveFrom: "2024-01-01", effectiveTo: "2024-07-01" },
					{ effectiveFrom: "2024-06-01", effectiveTo: null },
				),
			).toBe(true);
		});

		it("uses the open-end sentinel for null effectiveTo values", () => {
			expect(OPEN_EFFECTIVE_TO_SENTINEL).toBe("9999-12-31");
			expect(
				effectiveRangesOverlap(
					{ effectiveFrom: "2024-01-01", effectiveTo: null },
					{ effectiveFrom: "9999-01-01", effectiveTo: null },
				),
			).toBe(true);
		});
	});

	describe("isInvalidEffectiveDateRange", () => {
		it("accepts open-ended and strictly ordered ranges", () => {
			expect(
				isInvalidEffectiveDateRange({
					effectiveFrom: "2024-01-01",
					effectiveTo: null,
				}),
			).toBe(false);
			expect(
				isInvalidEffectiveDateRange({
					effectiveFrom: "2024-01-01",
					effectiveTo: "2024-12-31",
				}),
			).toBe(false);
		});

		it("rejects equal or inverted end dates", () => {
			expect(
				isInvalidEffectiveDateRange({
					effectiveFrom: "2024-06-01",
					effectiveTo: "2024-06-01",
				}),
			).toBe(true);
			expect(
				isInvalidEffectiveDateRange({
					effectiveFrom: "2024-06-01",
					effectiveTo: "2024-01-01",
				}),
			).toBe(true);
		});
	});

	describe("assertValidEffectiveDateRange", () => {
		it("throws when effectiveTo is not later than effectiveFrom", () => {
			expect(() =>
				assertValidEffectiveDateRange({
					effectiveFrom: "2024-06-01",
					effectiveTo: "2024-06-01",
				}),
			).toThrow(InvalidEffectiveDateRangeError);
		});
	});

	describe("appointmentEffectiveRange", () => {
		it("maps officer appointment dates to an effective range", () => {
			expect(
				appointmentEffectiveRange({
					appointedDate: "2024-01-01",
					resignedDate: "2024-12-31",
				}),
			).toEqual({
				effectiveFrom: "2024-01-01",
				effectiveTo: "2024-12-31",
			});
		});
	});

	describe("filterEffectiveAsOf", () => {
		it("returns only rows effective on the as-of date", () => {
			const rows = [
				{ id: "a", effectiveFrom: "2024-01-01", effectiveTo: "2024-06-01" },
				{ id: "b", effectiveFrom: "2024-06-01", effectiveTo: null },
			];
			expect(filterEffectiveAsOf(rows, "2024-03-01").map((row) => row.id)).toEqual(
				["a"],
			);
			expect(filterEffectiveAsOf(rows, "2024-06-01").map((row) => row.id)).toEqual(
				["b"],
			);
		});
	});

	describe("hasOverlappingRange", () => {
		it("detects overlap against existing rows", () => {
			const rows = [
				{ effectiveFrom: "2024-01-01", effectiveTo: "2024-06-01" },
			];
			expect(
				hasOverlappingRange(rows, {
					effectiveFrom: "2024-06-01",
					effectiveTo: null,
				}),
			).toBe(false);
			expect(
				hasOverlappingRange(rows, {
					effectiveFrom: "2024-05-01",
					effectiveTo: null,
				}),
			).toBe(true);
		});
	});
});
