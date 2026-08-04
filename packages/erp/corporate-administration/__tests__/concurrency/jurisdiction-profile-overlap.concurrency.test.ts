import {
	registerLegalCompanyDraft,
	setCompanyJurisdictionProfile,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	countCaAuditFacts,
	countCaJurisdictionProfiles,
	countCaLegalCompanies,
	createDrizzleCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`Corporate Administration jurisdiction profile overlap concurrency (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("allows one simultaneous overlapping insert and leaves no loser residue", async () => {
			const organizationId = uniqueCaOrganizationId("jurisdiction-concurrency");
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-race" }),
					caCommandOptions({ organizationId }),
					createDrizzleCompanyDependencies(),
				);
				expectOk(registered);
				const [first, second] = await Promise.all([
					setCompanyJurisdictionProfile(
						caJurisdictionProfileInput({
							legalCompanyId: registered.data.legalCompanyId,
							expectedCompanyVersion: registered.data.version,
							from: "2026-01-01",
							sourceReference: "race-1",
						}),
						caCommandOptions({ organizationId }),
						createDrizzleCompanyDependencies(),
					),
					setCompanyJurisdictionProfile(
						caJurisdictionProfileInput({
							legalCompanyId: registered.data.legalCompanyId,
							expectedCompanyVersion: registered.data.version,
							from: "2026-06-01",
							sourceReference: "race-2",
						}),
						caCommandOptions({ organizationId }),
						createDrizzleCompanyDependencies(),
					),
				]);
				const outcomes = [first, second];
				expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
				expect(
					outcomes.filter(
						(result) =>
							!result.ok &&
							result.code === "CONFLICT" &&
							result.message ===
								"Corporate Administration jurisdiction profile overlaps an existing profile.",
					),
				).toHaveLength(1);
				await expect(countCaLegalCompanies(organizationId)).resolves.toBe(1);
				await expect(countCaJurisdictionProfiles(organizationId)).resolves.toBe(
					1,
				);
				await expect(countCaAuditFacts(organizationId)).resolves.toBe(2);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(2);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		}, 30_000);
	},
);
