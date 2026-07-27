import { describe, expect, it } from "vitest";

import {
	type CompanyActivity,
	resolveActivitiesAsOf,
	validateActivityAuthority,
	validateActivityEffectiveRange,
} from "../../src/company";
import { organizationIdSchema, userIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-activity-rules");
const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const recordedBy = userIdSchema.parse("user-ca-activity-rules");

function activity(input: {
	id: string;
	classification: CompanyActivity["classification"];
	code?: string;
	primary?: boolean;
	from: string;
	to: string | null;
	regulatorCode?: string | null;
}): CompanyActivity {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		activityCode: input.code ?? "holding_company",
		classification: input.classification,
		jurisdictionCode: "MY",
		regulatorCode: input.regulatorCode ?? null,
		description: "Investment holding",
		effectiveFrom: input.from,
		effectiveTo: input.to,
		recordedAt: new Date("2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: "doc:activity",
		status: "active",
		version: 1,
	};
}

describe("company activity rules", () => {
	it("distinguishes registered, regulated and operational activities", () => {
		expect(
			validateActivityAuthority({
				activityType: "registered_object",
				classificationSystem: "registered_activity",
				activityCode: "holding_company",
				jurisdictionCode: "MY",
			}).ok,
		).toBe(true);
		expect(
			validateActivityAuthority({
				activityType: "regulated",
				classificationSystem: "registered_activity",
				activityCode: "fund_management",
				jurisdictionCode: "MY",
				regulatorCode: "SC",
			}).ok,
		).toBe(true);
		expect(
			validateActivityAuthority({
				activityType: "regulated",
				classificationSystem: "registered_activity",
				activityCode: "fund_management",
				jurisdictionCode: "MY",
				regulatorCode: null,
			}).ok,
		).toBe(false);
	});

	it("rejects duplicate effective activity and resolves end-dated history", () => {
		const existing = [
			activity({
				id: "activity-1",
				classification: "operational",
				from: "2024-01-01",
				to: "2025-01-01",
			}),
			activity({
				id: "activity-2",
				classification: "operational",
				from: "2025-01-01",
				to: null,
			}),
		];

		expect(
			validateActivityEffectiveRange({
				candidate: { from: "2025-06-01", to: null },
				existing,
				activityType: "operational",
				activityCode: "holding_company",
				jurisdictionCode: "MY",
			}).ok,
		).toBe(false);
		expect(
			resolveActivitiesAsOf({
				activities: existing,
				asOf: "2024-06-01",
				activityType: "operational",
			}).map((entry) => entry.id),
		).toEqual(["activity-1"]);
	});
});
