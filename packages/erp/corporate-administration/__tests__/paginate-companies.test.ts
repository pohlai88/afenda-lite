import { describe, expect, it } from "vitest";

import type { CaLegalCompany } from "../src/types";
import { paginateLegalCompanies } from "../src/shared/paginate-companies";

function company(
	overrides: Partial<CaLegalCompany> & Pick<CaLegalCompany, "id" | "code">,
): CaLegalCompany {
	return {
		organizationId: "org-a",
		normalizedCode: overrides.code.toUpperCase(),
		status: "draft",
		version: 1,
		legalEntityDimensionId: "10000000-0000-4000-8000-000000000001",
		legalEntityKeySnapshot: "LE-A",
		legalEntityNameSnapshot: "Legal Entity A",
		legalPartyId: null,
		legalPartyCodeSnapshot: null,
		legalPartyNameSnapshot: null,
		jurisdictionCountryId: null,
		legalFormCode: null,
		legalFormNameSnapshot: null,
		incorporationDate: null,
		dissolutionDate: null,
		createIdempotencyKey: "create-1",
		createRequestFingerprint: "fp-1",
		createdAt: new Date("2024-01-01T00:00:00.000Z"),
		updatedAt: new Date("2024-01-01T00:00:00.000Z"),
		createdBy: "user-1",
		updatedBy: "user-1",
		...overrides,
	};
}

describe("@afenda/corporate-administration paginateLegalCompanies", () => {
	it("matches normalized company codes case-insensitively", () => {
		const items = [
			company({
				id: "10000000-0000-4000-8000-000000000001",
				code: "CO-ALPHA",
				normalizedCode: "CO-ALPHA",
			}),
			company({
				id: "10000000-0000-4000-8000-000000000002",
				code: "CO-BETA",
				normalizedCode: "CO-BETA",
			}),
		];

		const page = paginateLegalCompanies(items, {
			query: "co-alpha",
			limit: 10,
		});

		expect(page.items).toHaveLength(1);
		expect(page.items[0]?.code).toBe("CO-ALPHA");
	});
});
