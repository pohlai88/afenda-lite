import {
	createGovernanceBody,
	defineStatutoryOffice,
	recordWrittenResolution,
	registerLegalCompanyDraft,
	registerLegalEstablishment,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import {
	CA_APP_01_TEXT_DIGEST,
	createCaApp01EstablishmentDependencies,
	createCaApp01GovernanceDependencies,
	createCaApp01OfficerDependencies,
	createCaApp01ResolutionDependencies,
} from "../helpers/ca-app-01-neon-deps";
import {
	caCommandOptions,
	caDraftInput,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	cleanupCorporateAdministrationGovernanceTestData,
	cleanupCorporateAdministrationOfficerTestData,
	cleanupCorporateAdministrationResolutionTestData,
	countCorporateAdministrationGovernanceBodies,
	countCorporateAdministrationLegalEstablishments,
	countCorporateAdministrationResolutions,
	countCorporateAdministrationStatutoryOffices,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`CA-APP-01 natural-key Neon concurrency (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("allows only one simultaneous establishment natural-key registration", async () => {
			const organizationId = uniqueCaOrganizationId("est-race");
			const dependencies = createCaApp01EstablishmentDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-est-race" }),
					options,
					dependencies,
				);
				expectOk(company);
				const baseInput = {
					legalCompanyId: company.data.legalCompanyId,
					establishmentType: "branch" as const,
					jurisdictionCode: "MY",
					registrationIdentifier: "BR-2026-RACE",
					registeredFrom: "2026-08-01",
					sourceDocumentId: "doc:est:race",
					expectedCompanyVersion: company.data.version,
				};

				const attempts = await Promise.all([
					registerLegalEstablishment(
						{ ...baseInput, displayName: "Race Branch A" },
						{ ...options, idempotencyKey: "idem-est-race-1" },
						dependencies,
					),
					registerLegalEstablishment(
						{ ...baseInput, displayName: "Race Branch B" },
						{ ...options, idempotencyKey: "idem-est-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				expect(attempts.find((result) => !result.ok)).toMatchObject({
					ok: false,
					code: "CONFLICT",
				});
				await expect(
					countCorporateAdministrationLegalEstablishments(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					organizationId,
				);
			}
		});

		it("allows only one simultaneous governance body natural-key create", async () => {
			const organizationId = uniqueCaOrganizationId("gov-race");
			const dependencies = createCaApp01GovernanceDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-gov-race" }),
					options,
					dependencies,
				);
				expectOk(company);
				const baseInput = {
					legalCompanyId: company.data.legalCompanyId,
					bodyType: "board" as const,
					bodyCode: "BOARD",
					description: null,
					effectiveFrom: "2026-01-01",
					sourceDocumentId: "doc:gov:race",
					expectedCompanyVersion: company.data.version,
				};

				const attempts = await Promise.all([
					createGovernanceBody(
						{ ...baseInput, displayName: "Board A" },
						{ ...options, idempotencyKey: "idem-gov-race-1" },
						dependencies,
					),
					createGovernanceBody(
						{ ...baseInput, displayName: "Board B" },
						{ ...options, idempotencyKey: "idem-gov-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				expect(attempts.find((result) => !result.ok)).toMatchObject({
					ok: false,
					code: "CONFLICT",
				});
				await expect(
					countCorporateAdministrationGovernanceBodies(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationGovernanceTestData(organizationId);
			}
		});

		it("allows only one simultaneous statutory office natural-key define", async () => {
			const organizationId = uniqueCaOrganizationId("off-race");
			const dependencies = createCaApp01OfficerDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-off-race" }),
					options,
					dependencies,
				);
				expectOk(company);
				const baseInput = {
					legalCompanyId: company.data.legalCompanyId,
					officeTypeCode: "DIRECTOR",
					jurisdictionCode: "MY",
					description: null,
					required: true,
					minimumHolders: 1,
					maximumHolders: 5,
					vacancyGraceDays: 30,
					protectedRole: false,
					effectiveFrom: "2026-01-01",
					sourceDocumentId: "doc:off:race",
					expectedCompanyVersion: company.data.version,
				};

				const attempts = await Promise.all([
					defineStatutoryOffice(
						{ ...baseInput, displayName: "Director A" },
						{ ...options, idempotencyKey: "idem-off-race-1" },
						dependencies,
					),
					defineStatutoryOffice(
						{ ...baseInput, displayName: "Director B" },
						{ ...options, idempotencyKey: "idem-off-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				expect(attempts.find((result) => !result.ok)).toMatchObject({
					ok: false,
					code: "CONFLICT",
				});
				await expect(
					countCorporateAdministrationStatutoryOffices(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationOfficerTestData(organizationId);
			}
		});

		it("allows only one simultaneous written-resolution code create", async () => {
			const organizationId = uniqueCaOrganizationId("res-race");
			const dependencies = createCaApp01ResolutionDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-res-race" }),
					options,
					dependencies,
				);
				expectOk(company);
				const baseInput = {
					legalCompanyId: company.data.legalCompanyId,
					resolutionCode: "WR-RACE-001",
					textDigest: CA_APP_01_TEXT_DIGEST,
					documentId: "doc:res:text",
					effectiveFrom: "2026-05-01",
					approvedAt: "2026-05-01T10:00:00.000Z",
					eligibleVotes: 3,
					votesFor: 3,
					thresholdType: "unanimous" as const,
					sourceDocumentId: "doc:res:race",
				};

				const attempts = await Promise.all([
					recordWrittenResolution(
						{ ...baseInput, title: "Resolution race A" },
						{ ...options, idempotencyKey: "idem-res-race-1" },
						dependencies,
					),
					recordWrittenResolution(
						{ ...baseInput, title: "Resolution race B" },
						{ ...options, idempotencyKey: "idem-res-race-2" },
						dependencies,
					),
				]);

				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				expect(attempts.find((result) => !result.ok)).toMatchObject({
					ok: false,
					code: "CONFLICT",
				});
				await expect(
					countCorporateAdministrationResolutions(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationResolutionTestData(organizationId);
			}
		});
	},
);
