import { describe, expect, it } from "vitest";

import {
	companyActivityTypeSchema,
	listCompanyActivitiesAsOfInputSchema,
	registerCompanyActivityInputSchema,
} from "../../src/features/company/index";

const legalCompanyId = "11111111-1111-4111-8111-111111111111";

describe("company activity contracts", () => {
	it("accepts registered, regulated and operational activity types", () => {
		for (const activityType of [
			"registered_object",
			"regulated",
			"operational",
		]) {
			expect(companyActivityTypeSchema.parse(activityType)).toBe(activityType);
		}
	});

	it("accepts the intended command and query payloads", () => {
		expect(
			registerCompanyActivityInputSchema.safeParse({
				legalCompanyId,
				activityCode: "fund_management",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "sc",
				description: "Fund management",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc:activity:1",
				expectedCompanyVersion: 1,
			}).success,
		).toBe(true);
		expect(
			listCompanyActivitiesAsOfInputSchema.safeParse({
				legalCompanyId,
				asOf: "2025-01-01",
				activityType: "regulated",
				classificationSystem: "registered_activity",
				jurisdictionCode: "MY",
				regulatorCode: "sc",
				primaryOnly: true,
				pageSize: 100,
			}).success,
		).toBe(true);
		expect(
			listCompanyActivitiesAsOfInputSchema.safeParse({
				legalCompanyId,
				asOf: "2025-01-01",
				pageSize: 101,
			}).success,
		).toBe(false);
	});
});
