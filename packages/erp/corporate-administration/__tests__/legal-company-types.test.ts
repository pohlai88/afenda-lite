import { describe, expect, it } from "vitest";

import type { CaLegalCompanyDetail } from "../src/schemas";
import {
	evaluateCompanyActivationReadiness,
	isEffectivePrimaryLegalName,
	isEffectivePrimaryRegistrationIdentifier,
} from "../src/shared/activation-readiness";
import { buildLegalCompanyAsOfView } from "../src/shared/as-of";
import {
	caCompanyIdentifierIdSchema,
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
	parseCaCompanyIdentifierId,
	parseCaCompanyNameId,
	parseCaLegalCompanyId,
} from "../src/brands";

const companyId = caLegalCompanyIdSchema.parse(
	"11111111-1111-4111-8111-111111111111",
);
const nameId = caCompanyNameIdSchema.parse(
	"22222222-2222-4222-8222-222222222222",
);
const identifierId = caCompanyIdentifierIdSchema.parse(
	"33333333-3333-4333-8333-333333333333",
);

function baseDetail(
	overrides: Partial<CaLegalCompanyDetail> = {},
): CaLegalCompanyDetail {
	return {
		id: companyId,
		organizationId: "org-1",
		code: "CO-1",
		normalizedCode: "co-1",
		legalEntityDimensionId: "44444444-4444-4444-8444-444444444444",
		legalEntityKeySnapshot: "le-1",
		legalEntityNameSnapshot: "Legal Entity 1",
		legalPartyId: "55555555-5555-4555-8555-555555555555",
		legalPartyCodeSnapshot: "party-1",
		legalPartyNameSnapshot: "Party 1",
		jurisdictionCountryId: null,
		legalFormCode: null,
		legalFormNameSnapshot: null,
		incorporationDate: null,
		commencementDate: null,
		fiscalYearEndMonth: null,
		fiscalYearEndDay: null,
		status: "draft",
		version: 1,
		createIdempotencyKey: "create-key",
		createRequestFingerprint: "create-fp",
		createdBy: "user-1",
		updatedBy: "user-1",
		activatedAt: null,
		activatedBy: null,
		suspendedAt: null,
		suspendedBy: null,
		dissolvedAt: null,
		dissolvedBy: null,
		archivedAt: null,
		archivedBy: null,
		createdAt: new Date("2024-01-01T00:00:00.000Z"),
		updatedAt: new Date("2024-01-01T00:00:00.000Z"),
		names: [
			{
				id: nameId,
				organizationId: "org-1",
				legalCompanyId: companyId,
				nameType: "legal",
				displayName: "Acme Holdings",
				normalizedName: "acme holdings",
				isPrimary: true,
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				supersedesCompanyNameId: null,
				correctionReason: null,
				idempotencyKey: "name-key",
				requestFingerprint: "name-fp",
				version: 1,
				createdBy: "user-1",
				updatedBy: "user-1",
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
				updatedAt: new Date("2024-01-01T00:00:00.000Z"),
			},
		],
		identifiers: [
			{
				id: identifierId,
				organizationId: "org-1",
				legalCompanyId: companyId,
				identifierType: "company_registration",
				jurisdictionCountryId: null,
				authorityPartyId: null,
				identifierValue: "123456-A",
				normalizedIdentifierValue: "123456-a",
				isPrimary: true,
				status: "active",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				idempotencyKey: "identifier-key",
				requestFingerprint: "identifier-fp",
				version: 1,
				createdBy: "user-1",
				updatedBy: "user-1",
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
				updatedAt: new Date("2024-01-01T00:00:00.000Z"),
			},
		],
		statusHistory: [],
		...overrides,
	};
}

describe("CA legal company brands", () => {
	it("rejects invalid legal company ids at parse boundary", () => {
		const parsed = parseCaLegalCompanyId("not-a-uuid");
		expect(parsed.ok).toBe(false);
	});

	it("rejects invalid company name ids at parse boundary", () => {
		const parsed = parseCaCompanyNameId("");
		expect(parsed.ok).toBe(false);
	});

	it("rejects invalid company identifier ids at parse boundary", () => {
		const parsed = parseCaCompanyIdentifierId("123");
		expect(parsed.ok).toBe(false);
	});
});

describe("evaluateCompanyActivationReadiness", () => {
	it("returns ready when all activation requirements are satisfied", () => {
		const readiness = evaluateCompanyActivationReadiness({
			detail: baseDetail(),
			effectiveDate: "2024-06-01",
			legalEntityEffective: true,
			partyActiveOrganization: true,
		});

		expect(readiness).toEqual({ ready: true, missing: [] });
	});

	it("reports each missing activation requirement", () => {
		const readiness = evaluateCompanyActivationReadiness({
			detail: baseDetail({
				legalPartyId: null,
				names: [],
				identifiers: [],
			}),
			effectiveDate: "2024-06-01",
			legalEntityEffective: false,
			partyActiveOrganization: false,
		});

		expect(readiness.ready).toBe(false);
		expect(readiness.missing).toEqual([
			"effective_legal_entity_dimension",
			"active_organization_party",
			"primary_legal_name",
			"primary_registration_identifier",
		]);
	});

	it.each([
		"registration_number",
		"company_registration_number",
	] as const)("returns ready when primary registration type is %s", (identifierType) => {
		const readiness = evaluateCompanyActivationReadiness({
			detail: baseDetail({
				identifiers: [
					{
						...baseDetail().identifiers[0]!,
						identifierType,
					},
				],
			}),
			effectiveDate: "2024-06-01",
			legalEntityEffective: true,
			partyActiveOrganization: true,
		});

		expect(readiness).toEqual({ ready: true, missing: [] });
	});

	it("reports primary_legal_name when two effective primary legal names exist", () => {
		const detail = baseDetail();
		const primaryName = detail.names[0]!;
		const readiness = evaluateCompanyActivationReadiness({
			detail: baseDetail({
				names: [
					primaryName,
					{
						...primaryName,
						id: caCompanyNameIdSchema.parse(
							"66666666-6666-4666-8666-666666666666",
						),
						displayName: "Acme Holdings Ltd",
						normalizedName: "acme holdings ltd",
					},
				],
			}),
			effectiveDate: "2024-06-01",
			legalEntityEffective: true,
			partyActiveOrganization: true,
		});

		expect(readiness.ready).toBe(false);
		expect(readiness.missing).toEqual(["primary_legal_name"]);
	});

	it("reports primary_registration_identifier when two effective primary registration identifiers exist", () => {
		const detail = baseDetail();
		const primaryIdentifier = detail.identifiers[0]!;
		const readiness = evaluateCompanyActivationReadiness({
			detail: baseDetail({
				identifiers: [
					primaryIdentifier,
					{
						...primaryIdentifier,
						id: caCompanyIdentifierIdSchema.parse(
							"77777777-7777-4777-8777-777777777777",
						),
						identifierValue: "987654-B",
						normalizedIdentifierValue: "987654-b",
					},
				],
			}),
			effectiveDate: "2024-06-01",
			legalEntityEffective: true,
			partyActiveOrganization: true,
		});

		expect(readiness.ready).toBe(false);
		expect(readiness.missing).toEqual(["primary_registration_identifier"]);
	});

	it("classifies effective primary legal and registration rows via shared predicates", () => {
		const detail = baseDetail();
		const effectiveDate = "2024-06-01";

		expect(
			isEffectivePrimaryLegalName(detail.names[0]!, effectiveDate),
		).toBe(true);
		expect(
			isEffectivePrimaryRegistrationIdentifier(
				detail.identifiers[0]!,
				effectiveDate,
			),
		).toBe(true);
		expect(
			isEffectivePrimaryRegistrationIdentifier(
				{
					...detail.identifiers[0]!,
					identifierType: "trade_license",
				},
				effectiveDate,
			),
		).toBe(false);
	});
});

describe("buildLegalCompanyAsOfView", () => {
	it("projects effective name, identifiers, and status as-of", () => {
		const detail = baseDetail({
			statusHistory: [
				{
					id: "history-1",
					organizationId: "org-1",
					legalCompanyId: companyId,
					fromStatus: "draft",
					toStatus: "active",
					effectiveAt: new Date("2024-06-01T00:00:00.000Z"),
					reasonCode: null,
					reason: null,
					resolutionReference: null,
					evidenceDocumentReference: null,
					correlationId: "corr-1",
					causationId: null,
					actorUserId: "user-1",
					idempotencyKey: "history-key",
					requestFingerprint: "history-fp",
					createdAt: new Date("2024-06-01T00:00:00.000Z"),
				},
			],
		});

		const asOf = buildLegalCompanyAsOfView(detail, "2024-06-01");

		expect(asOf.status).toBe("active");
		expect(asOf.company.status).toBe("active");
		expect(asOf.effectiveName?.displayName).toBe("Acme Holdings");
		expect(asOf.effectiveIdentifiers).toHaveLength(1);
		expect(asOf.effectiveIdentifiers[0]?.identifierValue).toBe("123456-A");
		expect(asOf.asOf).toBe("2024-06-01");
	});
});
