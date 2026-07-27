import { describe, expect, it } from "vitest";

import {
	type CompanyFinancialYear,
	resolveFinancialYearAsOf,
	validateFinancialYearChronology,
	validateFinancialYearEnd,
} from "../../src/company";
import { organizationIdSchema, userIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-fy-history");
const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const recordedBy = userIdSchema.parse("user-ca-fy-history");

function financialYear(input: {
	id: string;
	from: string;
	to: string | null;
	recordedAt: string;
	startMonth: number;
	startDay: number;
}): CompanyFinancialYear {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		fiscalYearStartMonth: input.startMonth,
		fiscalYearStartDay: input.startDay,
		reportingCurrencyCode: "MYR",
		effectiveFrom: input.from,
		effectiveTo: input.to,
		recordedAt: new Date(input.recordedAt),
		recordedBy,
		sourceDocumentId: "doc:fy",
		correctionReason: null,
		status: "active",
		version: 1,
	};
}

describe("company financial-year history rules", () => {
	it("validates current, future-dated, retroactive, asOf and knownAt history", () => {
		const history = [
			financialYear({
				id: "fy-1",
				from: "2024-01-01",
				to: "2025-07-01",
				recordedAt: "2024-01-02T00:00:00.000Z",
				startMonth: 1,
				startDay: 1,
			}),
			financialYear({
				id: "fy-2",
				from: "2025-07-01",
				to: null,
				recordedAt: "2026-01-15T10:00:00.000Z",
				startMonth: 7,
				startDay: 1,
			}),
		];

		expect(
			resolveFinancialYearAsOf({ financialYears: history, asOf: "2024-12-31" })
				?.id,
		).toBe("fy-1");
		expect(
			resolveFinancialYearAsOf({ financialYears: history, asOf: "2025-08-01" })
				?.id,
		).toBe("fy-2");
		expect(
			resolveFinancialYearAsOf({
				financialYears: history,
				asOf: "2025-08-01",
				knownAt: new Date("2025-12-31T00:00:00.000Z"),
			}),
		).toBeNull();
		expect(
			validateFinancialYearChronology({
				candidate: { from: "2025-01-01", to: null },
				existing: history,
			}).ok,
		).toBe(false);
	});

	it("rejects invalid financial-year month and day combinations", () => {
		expect(validateFinancialYearEnd({ month: 0, day: 31 }).ok).toBe(false);
		expect(validateFinancialYearEnd({ month: 4, day: 31 }).ok).toBe(false);
		expect(
			validateFinancialYearEnd({ month: 2, day: 29, allowFebruary29: false })
				.ok,
		).toBe(false);
	});
});
