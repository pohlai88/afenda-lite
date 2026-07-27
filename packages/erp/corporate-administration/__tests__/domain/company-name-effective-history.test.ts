import { describe, expect, it } from "vitest";

import {
	type CompanyName,
	resolveCompanyNameAsOf,
	validateCompanyNameEffectiveRange,
} from "../../src/company";
import { organizationIdSchema, userIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-name-history");
const legalCompanyId = "11111111-1111-4111-8111-111111111111";
const recordedBy = userIdSchema.parse("user-ca-name-history");

function name(input: {
	id: string;
	nameType: CompanyName["nameType"];
	languageCode: string;
	displayName: string;
	normalizedName: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	recordedAt?: string;
	status?: CompanyName["status"];
}): CompanyName {
	return {
		id: input.id,
		organizationId,
		legalCompanyId,
		nameType: input.nameType,
		languageCode: input.languageCode,
		displayName: input.displayName,
		normalizedName: input.normalizedName,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		recordedAt: new Date(input.recordedAt ?? "2026-01-01T00:00:00.000Z"),
		recordedBy,
		sourceDocumentId: null,
		correctionReason: null,
		status: input.status ?? "active",
		supersedesId: null,
		supersededAt: null,
		retiredAt: null,
		version: 1,
	};
}

describe("company name effective history", () => {
	it("allows multilingual name scopes without conflict", () => {
		const existing = [
			name({
				id: "22222222-2222-4222-8222-222222222221",
				nameType: "legal",
				languageCode: "en",
				displayName: "Alpha Private Limited",
				normalizedName: "alpha private limited",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
			}),
		];

		for (const candidate of [
			{ nameType: "translated", languageCode: "zh", normalizedName: "阿尔法" },
			{ nameType: "translated", languageCode: "ms", normalizedName: "alfa" },
			{ nameType: "trading", languageCode: "en", normalizedName: "alpha" },
			{
				nameType: "former",
				languageCode: "en",
				normalizedName: "alpha private limited",
			},
		] as const) {
			expect(
				validateCompanyNameEffectiveRange({
					candidate: { from: "2024-01-01", to: null },
					...candidate,
					existing,
				}).ok,
			).toBe(true);
		}
	});

	it("resolves former legal-name history by asOf and knownAt", () => {
		const names = [
			name({
				id: "22222222-2222-4222-8222-222222222221",
				nameType: "legal",
				languageCode: "en",
				displayName: "Alpha Private Limited",
				normalizedName: "alpha private limited",
				effectiveFrom: "2024-01-01",
				effectiveTo: "2025-05-01",
				recordedAt: "2024-01-01T00:00:00.000Z",
			}),
			name({
				id: "22222222-2222-4222-8222-222222222222",
				nameType: "legal",
				languageCode: "en",
				displayName: "Alpha Holdings Private Limited",
				normalizedName: "alpha holdings private limited",
				effectiveFrom: "2025-05-01",
				effectiveTo: null,
				recordedAt: "2025-05-01T00:00:00.000Z",
			}),
		];

		expect(
			resolveCompanyNameAsOf({
				names,
				nameType: "legal",
				languageCode: "en",
				asOf: "2024-12-31",
			})?.displayName,
		).toBe("Alpha Private Limited");
		expect(
			resolveCompanyNameAsOf({
				names,
				nameType: "legal",
				languageCode: "en",
				asOf: "2025-05-01",
			})?.displayName,
		).toBe("Alpha Holdings Private Limited");
		expect(names).toHaveLength(2);
	});
});
