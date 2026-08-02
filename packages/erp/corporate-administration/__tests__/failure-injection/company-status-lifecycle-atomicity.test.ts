import { randomUUID } from "node:crypto";
import {
	activateLegalCompany,
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
	countCorporateAdministrationCompanyStatusHistory,
	countCorporateAdministrationMutationReceiptsByStatus,
	countCorporateAdministrationOutboxEvents,
} from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`company status approval boundary (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("fails closed before database work when the production approval verifier is unavailable", async () => {
			const organizationId = `org-ca-status-approval-${randomUUID()}`;
			const dependencies = createDrizzleCompanyDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-status-approval" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const scope = {
					organizationId,
					commandId: "corporate-administration.legal-company.activate",
					idempotencyKey: "idem-status-approval-required",
				};

				const result = await activateLegalCompany(
					{
						legalCompanyId: registered.data.legalCompanyId,
						effectiveFrom: "2026-07-01",
						sourceDocumentId: "doc:status:approval",
						expectedCompanyVersion: registered.data.version,
					},
					{ ...options, idempotencyKey: scope.idempotencyKey },
					dependencies,
				);

				expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
				await expect(
					countCorporateAdministrationCompanyStatusHistory(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						scope,
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						scope,
						"released",
					),
				).resolves.toBe(0);
				await expect(
					dependencies.store.getLegalCompany({
						organizationId,
						legalCompanyId: registered.data.legalCompanyId,
					}),
				).resolves.toMatchObject({
					ok: true,
					data: { state: "draft", version: registered.data.version },
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});

		it("rejects simultaneous activation attempts without approval and leaves no activation residue", async () => {
			const organizationId = `org-ca-status-race-${randomUUID()}`;
			const dependencies = createDrizzleCompanyDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const registered = await registerLegalCompanyDraft(
					caDraftInput({ companyCode: "af-status-race" }),
					options,
					dependencies,
				);
				expectOk(registered);
				const input = {
					legalCompanyId: registered.data.legalCompanyId,
					effectiveFrom: "2026-07-01",
					sourceDocumentId: "doc:status:race",
					expectedCompanyVersion: registered.data.version,
				};

				const attempts = await Promise.all([
					activateLegalCompany(
						input,
						{ ...options, idempotencyKey: "idem-status-race-1" },
						dependencies,
					),
					activateLegalCompany(
						input,
						{ ...options, idempotencyKey: "idem-status-race-2" },
						dependencies,
					),
				]);

				expect(attempts).toMatchObject([
					{ ok: false, code: "FORBIDDEN" },
					{ ok: false, code: "FORBIDDEN" },
				]);
				await expect(
					countCorporateAdministrationCompanyStatusHistory(organizationId),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(1);
				await expect(
					dependencies.store.getLegalCompany({
						organizationId,
						legalCompanyId: registered.data.legalCompanyId,
					}),
				).resolves.toMatchObject({
					ok: true,
					data: { state: "draft", version: registered.data.version },
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		});
	},
);
