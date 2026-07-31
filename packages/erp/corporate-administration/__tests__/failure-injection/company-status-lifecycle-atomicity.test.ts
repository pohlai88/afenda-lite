// biome-ignore-all lint/style/useDestructuring: Explicit state access keeps failure-injection checkpoints visible.
import { randomUUID } from "node:crypto";
import {
	activateLegalCompany,
	addCompanyName,
	type CompanyActivityStore,
	type CompanyFinancialYearStore,
	type CompanyIdentifierStore,
	type CompanyLegalFormStore,
	type CompanyNameStore,
	type EstablishmentStore,
	type LegalCompanyStore,
	registerCompanyActivity,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
	setCompanyFinancialYear,
	setCompanyJurisdictionProfile,
	setCompanyLegalForm,
	setRegisteredAddress,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationEstablishmentStore } from "@afenda/corporate-administration/adapters/drizzle";
import { database as afendaDatabase } from "@afenda/db";
import { describe, expect, it } from "vitest";
import {
	caCommandOptions,
	caDraftInput,
	caJurisdictionProfileInput,
	createDrizzleCompanyDependencies,
	expectOk,
	failingOutboxPort,
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

type PhaseOneStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;
function createPhaseOneDependencies() {
	const dependencies = createDrizzleCompanyDependencies();
	const store = dependencies.store as PhaseOneStore;
	return {
		...dependencies,
		nameStore: store,
		legalFormStore: store,
		identifierStore: store,
		financialYearStore: store,
		activityStore: store,
		companyStore: store,
		establishmentStore: createDrizzleCorporateAdministrationEstablishmentStore({
			database: afendaDatabase.client,
			createId: randomUUID,
		}) as EstablishmentStore,
		addressReferences: {
			getPartyAddress: async (input) => ({
				ok: true,
				data: {
					organizationId: input.organizationId,
					partyId: input.partyId,
					active: true,
					sourcePartyAddressId: input.partyAddressId,
					line1: "Level 12, Menara Afenda",
					line2: null,
					city: "Kuala Lumpur",
					region: "Wilayah Persekutuan",
					postalCode: "50088",
					countryCode: "MY",
				},
			}),
		},
	};
}
describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
	`company status lifecycle atomicity (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
	() => {
		it("rolls back activation status, outbox and completed receipt when status outbox append fails, then retries with the same idempotency key", async () => {
			const organizationId = `org-ca-status-atomic-${randomUUID()}`;
			const dependencies = createPhaseOneDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const seeded = await seedCompletePhaseOneCompany(
					dependencies,
					organizationId,
				);
				const beforeStatusHistory =
					await countCorporateAdministrationCompanyStatusHistory(
						organizationId,
					);
				const beforeOutbox =
					await countCorporateAdministrationOutboxEvents(organizationId);
				const activationScope = {
					organizationId,
					commandId: "corporate-administration.legal-company.activate",
					idempotencyKey: "idem-status-atomic-activate",
				};
				const failed = await activateLegalCompany(
					{
						legalCompanyId: seeded.legalCompanyId,
						effectiveFrom: "2026-07-01",
						sourceDocumentId: "doc:status:atomic",
						expectedCompanyVersion: seeded.version,
					},
					{ ...options, idempotencyKey: activationScope.idempotencyKey },
					{
						...dependencies,
						runtime: {
							...dependencies.runtime,
							outbox: failingOutboxPort(),
						},
					},
				);
				expect(failed).toMatchObject({
					ok: false,
					code: "SERVICE_UNAVAILABLE",
				});
				await expect(
					countCorporateAdministrationCompanyStatusHistory(organizationId),
				).resolves.toBe(beforeStatusHistory);
				await expect(
					countCorporateAdministrationOutboxEvents(organizationId),
				).resolves.toBe(beforeOutbox);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						activationScope,
						"completed",
					),
				).resolves.toBe(0);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						activationScope,
						"released",
					),
				).resolves.toBe(1);
				await expect(
					dependencies.store.getLegalCompany({
						organizationId: options.organizationId,
						legalCompanyId: seeded.legalCompanyId,
					}),
				).resolves.toMatchObject({
					ok: true,
					data: { state: "draft", version: seeded.version },
				});
				const retried = await activateLegalCompany(
					{
						legalCompanyId: seeded.legalCompanyId,
						effectiveFrom: "2026-07-01",
						sourceDocumentId: "doc:status:atomic",
						expectedCompanyVersion: seeded.version,
					},
					{ ...options, idempotencyKey: activationScope.idempotencyKey },
					dependencies,
				);
				expectOk(retried);
				expect(retried.data.status).toBe("active");
				await expect(
					countCorporateAdministrationCompanyStatusHistory(organizationId),
				).resolves.toBe(beforeStatusHistory + 1);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						activationScope,
						"completed",
					),
				).resolves.toBe(1);
				await expect(
					countCorporateAdministrationMutationReceiptsByStatus(
						activationScope,
						"released",
					),
				).resolves.toBe(0);
				await expect(
					dependencies.store.getLegalCompany({
						organizationId: options.organizationId,
						legalCompanyId: seeded.legalCompanyId,
					}),
				).resolves.toMatchObject({
					ok: true,
					data: { state: "active", version: seeded.version + 1 },
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		}, 45_000);
		it("allows only one simultaneous activation for the same expected company version", async () => {
			const organizationId = `org-ca-status-race-${randomUUID()}`;
			const dependencies = createPhaseOneDependencies();
			const options = caCommandOptions({ organizationId });
			try {
				const seeded = await seedCompletePhaseOneCompany(
					dependencies,
					organizationId,
				);
				const beforeStatusHistory =
					await countCorporateAdministrationCompanyStatusHistory(
						organizationId,
					);
				const attempts = await Promise.all([
					activateLegalCompany(
						{
							legalCompanyId: seeded.legalCompanyId,
							effectiveFrom: "2026-07-01",
							sourceDocumentId: "doc:status:race",
							expectedCompanyVersion: seeded.version,
						},
						{ ...options, idempotencyKey: "idem-status-race-1" },
						dependencies,
					),
					activateLegalCompany(
						{
							legalCompanyId: seeded.legalCompanyId,
							effectiveFrom: "2026-07-01",
							sourceDocumentId: "doc:status:race",
							expectedCompanyVersion: seeded.version,
						},
						{ ...options, idempotencyKey: "idem-status-race-2" },
						dependencies,
					),
				]);
				expect(attempts.filter((result) => result.ok)).toHaveLength(1);
				expect(attempts.filter((result) => !result.ok)).toHaveLength(1);
				await expect(
					countCorporateAdministrationCompanyStatusHistory(organizationId),
				).resolves.toBe(beforeStatusHistory + 1);
				await expect(
					dependencies.store.getLegalCompany({
						organizationId: options.organizationId,
						legalCompanyId: seeded.legalCompanyId,
					}),
				).resolves.toMatchObject({
					ok: true,
					data: { state: "active", version: seeded.version + 1 },
				});
			} finally {
				await cleanupCorporateAdministrationInfrastructureTestData(
					organizationId,
				);
			}
		}, 45_000);
	},
);
async function seedCompletePhaseOneCompany(
	dependencies: ReturnType<typeof createPhaseOneDependencies>,
	organizationId: string,
) {
	const options = caCommandOptions({ organizationId });
	const registered = await registerLegalCompanyDraft(
		caDraftInput({ companyCode: "af-status-atomic" }),
		options,
		dependencies,
	);
	expectOk(registered);
	const legalCompanyId = registered.data.legalCompanyId;
	let version = registered.data.version;
	const jurisdiction = await setCompanyJurisdictionProfile(
		caJurisdictionProfileInput({
			legalCompanyId,
			expectedCompanyVersion: version,
		}),
		{ ...options, idempotencyKey: "idem-status-atomic-jurisdiction" },
		dependencies,
	);
	expectOk(jurisdiction);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const name = await addCompanyName(
		{
			legalCompanyId,
			nameType: "legal",
			languageCode: "en",
			displayName: "Afenda Status Atomic Sdn Bhd",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:name",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-name" },
		dependencies,
	);
	expectOk(name);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const legalForm = await setCompanyLegalForm(
		{
			legalCompanyId,
			legalFormCode: "private_limited_company",
			jurisdictionCode: "MY",
			entityTypeCode: "private_limited_company",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:legal-form",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-legal-form" },
		dependencies,
	);
	expectOk(legalForm);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const identifier = await registerCompanyIdentifier(
		{
			legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: "SSM",
			identifierValue: "2026-01234567",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:identifier",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-identifier" },
		dependencies,
	);
	expectOkWithDetails(identifier);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const financialYear = await setCompanyFinancialYear(
		{
			legalCompanyId,
			fiscalYearStartMonth: 7,
			fiscalYearStartDay: 1,
			reportingCurrencyCode: "MYR",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:financial-year",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-financial-year" },
		dependencies,
	);
	expectOk(financialYear);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const activity = await registerCompanyActivity(
		{
			legalCompanyId,
			activityCode: "holding_company",
			classification: "registered_object",
			jurisdictionCode: "MY",
			regulatorCode: null,
			description: "Holding activity",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:activity",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-activity" },
		dependencies,
	);
	expectOk(activity);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	const address = await setRegisteredAddress(
		{
			legalCompanyId,
			addressType: "registered_office",
			sourcePartyAddressId: "11111111-1111-4111-8111-111111111111",
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			sourceDocumentId: "doc:status:address",
			expectedCompanyVersion: version,
		},
		{ ...options, idempotencyKey: "idem-status-atomic-address" },
		dependencies,
	);
	expectOk(address);
	version = await reloadCompanyVersion(
		dependencies,
		options.organizationId,
		legalCompanyId,
	);
	return { legalCompanyId, version };
}
async function reloadCompanyVersion(
	dependencies: ReturnType<typeof createPhaseOneDependencies>,
	organizationId: Parameters<
		LegalCompanyStore["getLegalCompany"]
	>[0]["organizationId"],
	legalCompanyId: Parameters<
		LegalCompanyStore["getLegalCompany"]
	>[0]["legalCompanyId"],
): Promise<number> {
	const company = await dependencies.store.getLegalCompany({
		organizationId,
		legalCompanyId,
	});
	if (!company.ok || company.data === null) {
		throw new Error("Could not reload legal company aggregate version.");
	}
	return company.data.version;
}
function expectOkWithDetails<T>(
	result:
		| {
				ok: true;
				data: T;
		  }
		| {
				ok: false;
				code: string;
				message: string;
				details?: unknown;
		  },
): asserts result is {
	ok: true;
	data: T;
} {
	if (!result.ok) {
		throw new Error(
			`Expected successful Corporate Administration result: ${JSON.stringify(result)}`,
		);
	}
}
