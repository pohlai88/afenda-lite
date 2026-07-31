import { randomUUID } from "node:crypto";

import {
	registerLegalCompanyDraft,
	registerLegalEstablishment,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationEstablishmentStore } from "@afenda/corporate-administration/adapters/drizzle";
import { db } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	caCommandOptions,
	caDraftInput,
	createDrizzleCompanyDependencies,
	expectOk,
} from "../helpers/legal-company-test-kit";
import {
	cleanupCorporateAdministrationEstablishmentTestData,
	countCorporateAdministrationLegalEstablishments,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`legal establishment Neon parity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("allows one winner for simultaneous duplicate establishment registration", async () => {
			const organizationId = `org-ca-establishment-db-${randomUUID()}`;
			const base = createDrizzleCompanyDependencies();
			const establishmentStore =
				createDrizzleCorporateAdministrationEstablishmentStore({
					database: db,
					createId: randomUUID,
				});
			const dependencies = {
				...base,
				companyStore: base.store,
				establishmentStore,
				addressReferences: {
					getPartyAddress: async () => errorResult.ok(null),
				},
			};
			const options = caCommandOptions({ organizationId });
			try {
				const company = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-establishment-db" }),
					options,
					dependencies,
				);
				expectOk(company);
				const input = {
					legalCompanyId: company.data.legalCompanyId,
					establishmentType: "branch" as const,
					jurisdictionCode: "MY",
					registrationIdentifier: "BR-2026-001",
					displayName: "Kuala Lumpur Branch",
					registeredFrom: "2026-08-01",
					sourceDocumentId: "doc:establishment:db",
					expectedCompanyVersion: company.data.version,
				};
				const results = await Promise.all([
					registerLegalEstablishment(
						input,
						{ ...options, idempotencyKey: "idem-establishment-a" },
						dependencies,
					),
					registerLegalEstablishment(
						input,
						{ ...options, idempotencyKey: "idem-establishment-b" },
						dependencies,
					),
				]);
				expect(
					results.filter((result) => result.ok),
					JSON.stringify(results),
				).toHaveLength(1);
				expect(results.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationLegalEstablishments(organizationId),
				).resolves.toBe(1);
			} finally {
				await cleanupCorporateAdministrationEstablishmentTestData(
					organizationId,
				);
			}
		});
	},
);
