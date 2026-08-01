import { describe, expect, it } from "vitest";

import {
	isoDateSchema,
	payrollDecimalStringSchema,
} from "../src/schemas/common";

describe("payroll calendar-date contract", () => {
	it.each(["2026-01-31", "2028-02-29"])("accepts %s", (value) => {
		expect(isoDateSchema.safeParse(value).success).toBe(true);
	});

	it.each([
		"2026-02-29",
		"2026-13-01",
		"2026-00-10",
		"2026-04-31",
	])("rejects non-calendar date %s", (value) => {
		expect(isoDateSchema.safeParse(value).success).toBe(false);
	});
});

describe("payroll decimal storage contract", () => {
	it.each([
		"1.1234567890123",
		"1234567890123.00",
	])("rejects numeric(24,12) overflow %s", (value) => {
		expect(payrollDecimalStringSchema.safeParse(value).success).toBe(false);
	});

	it.each([
		"999999999999.999999999999",
		"0000000000001.25",
	])("accepts representable value %s", (value) => {
		expect(payrollDecimalStringSchema.safeParse(value).success).toBe(true);
	});
});
