import { randomUUID } from "node:crypto";
import {
	type CompanyIdentifierStore,
	type LegalCompanyStore,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationInfrastructureTestData,
	countCorporateAdministrationCompanyIdentifiers,
	countCorporateAdministrationMutationReceipts,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

type CompanyIdentityStore = LegalCompanyStore & CompanyIdentifierStore;

function createIdentityDependencies() {
	const dependencies = createDrizzleCompanyDependencies();
	const store = dependencies.store as CompanyIdentityStore;
	return {
		...dependencies,
		identifierStore: store,
	};
}

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`company identity atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back identifier, receipt, audit and outbox rows when event append fails", async () => {
			const organizationId = `org-ca-identity-atomic-${randomUUID()}`;
			const dependencies = createIdentityDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-identity-atomic" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);

				const result = await registerCompanyIdentifier(
					{
						legalCompanyId: registered.data.legalCompanyId,
						identifierType: "company_registration",
						jurisdictionCode: "MY",
						issuingAuthorityCode: "SSM",
						identifierValue: "2026-01234567",
						effectiveFrom: "2026-01-01",
						effectiveTo: null,
						sourceDocumentId: "doc:identifier:atomic",
						expectedCompanyVersion: registered.data.version,
					},
					{ ...options, idempotencyKey: "idem-identity-atomic" },
					{
						...dependencies,
						runtime: {
							...dependencies.runtime,
							outbox: {
								append: async () => ({
									ok: false,
									code: "SERVICE_UNAVAILABLE",
									message: "Injected outbox failure.",
								}),
							},
						},
					},
				);

				expect(result.ok).toBe(false);
				await expect(
					countCorporateAdministrationCompanyIdentifiers(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceipts({
						organizationId,
						commandId:
							"corporate-administration.legal-company.register-company-identifier",
						idempotencyKey: "idem-identity-atomic",
					}),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);
