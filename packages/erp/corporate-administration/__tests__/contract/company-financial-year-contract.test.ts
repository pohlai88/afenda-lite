import { describe, expect, it } from "vitest";

import {
	financialYearCalendarSchema,
	financialYearEndSchema,
	findCompanyFinancialYearAsOfInputSchema,
	setCompanyFinancialYearInputSchema,
	validateFinancialYearEnd,
} from "../../src/company";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";

describe("company financial-year contracts", () => {
	it("accepts the intended command and query payloads", () => {
		expect(
			setCompanyFinancialYearInputSchema.safeParse({
				legalCompanyId,
				fiscalYearStartMonth: 1,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:financial-year:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			findCompanyFinancialYearAsOfInputSchema.safeParse({
				legalCompanyId,
				asOf: "2025-01-01",
				knownAt: new Date("2026-01-15T10:00:00.000Z"),
			}).success,
		).toBe(true);
	});

	it("rejects invalid month and day contracts before command execution", () => {
		expect(
			financialYearEndSchema.safeParse({ month: 13, day: 31 }).success,
		).toBe(false);
		expect(validateFinancialYearEnd({ month: 4, day: 31 }).ok).toBe(false);
		expect(
			validateFinancialYearEnd({
				month: 2,
				day: 29,
				allowFebruary29: false,
			}).ok,
		).toBe(false);
		expect(
			financialYearCalendarSchema.safeParse({
				fiscalYearStartMonth: 2,
				fiscalYearStartDay: 30,
				reportingCurrencyCode: "MYR",
			}).success,
		).toBe(false);
	});
});
