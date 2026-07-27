import {
	getLegalCompany,
	listLegalCompanies,
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	caQueryOptions,
	countCaJurisdictionProfiles,
	countCaLegalCompanies,
	createDrizzleCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import { cleanupCorporateAdministrationInfrastructureTestData } from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`Corporate Administration legal-company jurisdiction Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("persists and reloads a legal company jurisdiction profile", async () => {
			const organizationId = uniqueCaOrganizationId("jurisdiction-neon");
			const dependencies = createDrizzleCompanyDependencies();
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-neon" }),
					caCommandOptions({ organizationId }),
					dependencies,
				);
				expectOk(registered);
				const profile = await setCompanyJurisdictionProfile(
					caJurisdictionProfileInput({
						legalCompanyId: registered.data.legalCompanyId,
						expectedCompanyVersion: registered.data.version,
					}),
					caCommandOptions({ organizationId }),
					dependencies,
				);
				expectOk(profile);

				const reloaded = await getLegalCompany(
					{ legalCompanyId: registered.data.legalCompanyId },
					caQueryOptions({ organizationId }),
					dependencies,
				);
				expectOk(reloaded);
				expect(reloaded.data?.currentJurisdictionProfile).toMatchObject({
					jurisdictionProfileId: profile.data.jurisdictionProfileId,
					organizationId,
					jurisdictionCountryCode: "MY",
					entityType: "private_limited_company",
				});

				const list = await listLegalCompanies(
					undefined,
					caQueryOptions({ organizationId }),
					dependencies,
				);
				expectOk(list);
				expect(list.data.items).toHaveLength(1);
				await expect(countCaLegalCompanies(organizationId)).resolves.toBe(1);
				await expect(countCaJurisdictionProfiles(organizationId)).resolves.toBe(
					1,
				);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		}, 30_000);
	},
);
