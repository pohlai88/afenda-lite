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
	createDrizzleCompanyDependencies,
	expectOk,
	failingOutboxPort,
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
	`Corporate Administration legal-company jurisdiction atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back profile, audit, and outbox when outbox append fails", async () => {
			const organizationId = uniqueCaOrganizationId("jurisdiction-atomicity");
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-atomic" }),
					caCommandOptions({ organizationId }),
					createDrizzleCompanyDependencies(),
				);
				expectOk(registered);

				const dependencies = createDrizzleCompanyDependencies();
				const result = await setCompanyJurisdictionProfile(
					caJurisdictionProfileInput({
						legalCompanyId: registered.data.legalCompanyId,
						expectedCompanyVersion: registered.data.version,
					}),
					caCommandOptions({ organizationId }),
					{
						...dependencies,
						runtime: {
							...dependencies.runtime,
							outbox: failingOutboxPort(),
						},
					},
				);

				expect(result).toMatchObject({
					ok: false,
					code: "SERVICE_UNAVAILABLE",
				});
				await expect(countCaJurisdictionProfiles(organizationId)).resolves.toBe(
					0,
				);
				await expect(countCaAuditFacts(organizationId)).resolves.toBe(1);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		}, 30_000);
	},
);
