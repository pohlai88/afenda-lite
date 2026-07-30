import {
	addCompanyName,
	type CanonicalJsonValue,
	type ClockPort,
	type CompanyActivityCommandDependencies,
	type CompanyFinancialYearCommandDependencies,
	type CompanyIdentifierCommandDependencies,
	type CompanyJurisdictionRulePort,
	type CompanyLegalFormCommandDependencies,
	type CompanyNameCommandDependencies,
	type CompanyPartyReferencePort,
	type CompanyReferenceDataPort,
	type CorporateAdministrationAuditFactInput,
	type CorporateAdministrationAuditFactPort,
	type CorporateAdministrationCommandOptions,
	type CorporateAdministrationIdempotencyBeginInput,
	type CorporateAdministrationIdempotencyBeginOutcome,
	type CorporateAdministrationIdempotencyCompletionInput,
	type CorporateAdministrationIdempotencyPort,
	type CorporateAdministrationIdempotencyReleaseInput,
	type CorporateAdministrationOutboxPort,
	type CorporateAdministrationPendingEvent,
	type CorporateAdministrationTransactionContext,
	type CorporateAdministrationTransactionPort,
	canonicalDateSchema,
	correlationIdSchema,
	type DocumentObjectPort,
	type EstablishmentCommandDependencies,
	type EstablishmentQueryDependencies,
	getCompanyCompletenessForActivation,
	idempotencyKeySchema,
	idempotencyReservationTokenSchema,
	organizationIdSchema,
	registerCompanyActivity,
	registerCompanyIdentifier,
	registerLegalCompanyDraft,
	setCompanyFinancialYear,
	setCompanyJurisdictionProfile,
	setCompanyLegalForm,
	setRegisteredAddress,
	type TaxRegistrationReadPort,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createMemoryCorporateAdministrationEstablishmentStore,
	createMemoryCorporateAdministrationLegalCompanyStore,
} from "@afenda/corporate-administration/testing";
import { ok, type Result } from "@afenda/errors/result";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-ca-real-journey",
	orgId: "org-ca-real-journey",
	role: "member" as const,
	email: "member@example.com",
};

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
const permission = vi.hoisted(() => ({ forbidUnlessPermission: vi.fn() }));
const composition = vi.hoisted(() => ({
	createOptions: vi.fn(),
	createQueryOptions: vi.fn(),
	createDependencies: vi.fn(),
}));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@afenda/auth", () => ({
	getSession: auth.getSession,
	requireRole: vi.fn(),
}));
vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-ca-real-journey",
}));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permission.forbidUnlessPermission,
}));
vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: composition.createOptions,
	createCorporateAdministrationQueryOptions: composition.createQueryOptions,
	createCorporateAdministrationCompanyDependencies:
		composition.createDependencies,
}));
vi.mock("next/cache", () => ({ revalidatePath: cache.revalidatePath }));

import { activateLegalCompanyAction } from "../../app/actions/legal-company-lifecycle-actions";
import {
	type LegalCompanyActivationCompleteness,
	type LegalCompanyLifecycleCompany,
	LegalCompanyLifecycleWorkspace,
} from "../../features/corporate-administration/legal-company-lifecycle-workspace";

type RealPackageDependencies = CompanyNameCommandDependencies &
	CompanyLegalFormCommandDependencies &
	CompanyIdentifierCommandDependencies &
	CompanyFinancialYearCommandDependencies &
	CompanyActivityCommandDependencies &
	EstablishmentCommandDependencies &
	EstablishmentQueryDependencies &
	Readonly<{
		store: ReturnType<
			typeof createMemoryCorporateAdministrationLegalCompanyStore
		>;
		companyStore: ReturnType<
			typeof createMemoryCorporateAdministrationLegalCompanyStore
		>;
		jurisdictionRules: CompanyJurisdictionRulePort;
		partyReferences: CompanyPartyReferencePort;
		referenceData: CompanyReferenceDataPort;
		documentObjects: DocumentObjectPort;
		taxRegistrations: TaxRegistrationReadPort;
		runtime: {
			clock: ClockPort;
			transaction: CorporateAdministrationTransactionPort;
			idempotency: CorporateAdministrationIdempotencyPort;
			audit: CorporateAdministrationAuditFactPort;
			outbox: CorporateAdministrationOutboxPort;
		};
		createEventId: () => string;
	}>;

type SeededLegalCompanyId = Parameters<
	RealPackageDependencies["store"]["getLegalCompany"]
>[0]["legalCompanyId"];

const legalCompanyIdPattern = /^[0-9a-f-]{36}$/;

describe("Corporate Administration Phase 1 real package journey", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		auth.getSession.mockResolvedValue(session);
		permission.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("persists a complete Phase 1 company through real package commands and activates through the Server Action", async () => {
		const dependencies = createRealPackageDependencies();
		composition.createDependencies.mockReturnValue(dependencies);
		composition.createOptions.mockImplementation((input) =>
			createOptions({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				idempotencyKey: input.idempotencyKey,
			}),
		);
		composition.createQueryOptions.mockImplementation((input) =>
			createOptions({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				idempotencyKey: "query-idempotency-not-used",
			}),
		);

		const seeded = await seedCompletePhaseOneCompany(dependencies);
		expect(seeded.legalCompanyId).toMatch(legalCompanyIdPattern);

		const completeness = await getCompanyCompletenessForActivation(
			{
				legalCompanyId: seeded.legalCompanyId,
				asOf: "2026-07-01",
			},
			createOptions({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId: "corr-ca-real-journey-query",
				idempotencyKey: "query-idempotency-not-used",
			}),
			dependencies,
		);
		expect(completeness.ok).toBe(true);
		if (!completeness.ok) {
			return;
		}
		expect(completeness.data.complete).toBe(true);

		const beforeActivation: LegalCompanyLifecycleCompany = {
			legalCompanyId: seeded.legalCompanyId,
			companyCode: "AF-MY-REAL",
			displayName: "Afenda Malaysia Real Package",
			state: "draft",
			version: seeded.version,
		};
		const preActivationMarkup = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: beforeActivation,
				completeness: toLifecycleCompleteness(completeness.data),
				organizationSlug: "afenda",
			}),
		);
		expect(preActivationMarkup).toContain("Activation ready");
		expect(preActivationMarkup).toContain('aria-label="Activate"');

		const activated = await activateLegalCompanyAction(
			toFormData({
				organizationSlug: "afenda",
				legalCompanyId: seeded.legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-ca-real-activation",
				expectedCompanyVersion: String(seeded.version),
				idempotencyKey: "idem-ca-real-activation",
			}),
		);
		expect(activated).toEqual(
			expect.objectContaining({
				ok: true,
				data: expect.objectContaining({
					legalCompanyId: seeded.legalCompanyId,
					status: "active",
				}),
			}),
		);
		expect(cache.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);

		const persisted = await dependencies.store.getLegalCompany({
			organizationId: organizationIdSchema.parse(session.orgId),
			legalCompanyId: seeded.legalCompanyId,
		});
		expect(persisted.ok).toBe(true);
		if (!persisted.ok) {
			return;
		}
		expect(persisted.data?.state).toBe("active");
		expect(persisted.data?.version).toBe(seeded.version + 1);
		if (persisted.data === null) {
			throw new Error("Expected persisted company");
		}

		const reloadMarkup = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: {
					legalCompanyId: seeded.legalCompanyId,
					companyCode: persisted.data.companyCode,
					displayName: persisted.data.profile.displayName,
					state: "active",
					version: persisted.data.version,
				},
				completeness: toLifecycleCompleteness(completeness.data),
				organizationSlug: "afenda",
			}),
		);
		expect(reloadMarkup).toContain(`Active · v${seeded.version + 1}`);
		expect(reloadMarkup).toContain('aria-label="Suspend"');
		expect(reloadMarkup).toContain('aria-label="Enter liquidation"');
		expect(reloadMarkup).not.toContain('name="organizationId"');
	});
});

async function seedCompletePhaseOneCompany(
	dependencies: RealPackageDependencies,
): Promise<{ legalCompanyId: SeededLegalCompanyId; version: number }> {
	const commandOptions = (key: string) =>
		createOptions({
			organizationId: session.orgId,
			actorUserId: session.userId,
			correlationId: "corr-ca-real-seed",
			idempotencyKey: key,
		});

	const company = await registerLegalCompanyDraft(
		{
			companyCode: "AF-MY-REAL",
			displayName: "Afenda Malaysia Real Package",
			masterDataPartyId: "party-ca-real",
			homeJurisdictionCountryCode: "MY",
			sourceReference: "doc-ca-real-draft",
		},
		commandOptions("idem-ca-real-draft"),
		dependencies,
	);
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared journey helper is invoked only by test cases.
	expect(company.ok).toBe(true);
	if (!company.ok) {
		throw new Error("Could not seed legal company");
	}

	const { legalCompanyId } = company.data;
	let { version } = company.data;

	version = await expectSuccessAndRefreshCompanyVersion(
		setCompanyJurisdictionProfile(
			{
				legalCompanyId,
				jurisdictionCountryCode: "MY",
				entityType: "private_limited_company",
				effectiveRange: { from: "2026-01-01", to: null },
				recordedAt: "2026-01-01T00:00:00.000Z",
				sourceReference: "doc-ca-real-jurisdiction",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-jurisdiction"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		addCompanyName(
			{
				legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				displayName: "Afenda Malaysia Real Package Sdn Bhd",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-name",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-name"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		setCompanyLegalForm(
			{
				legalCompanyId,
				legalFormCode: "private_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-legal-form",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-legal-form"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		registerCompanyIdentifier(
			{
				legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-REAL-001",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-identifier",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-identifier"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		setCompanyFinancialYear(
			{
				legalCompanyId,
				fiscalYearStartMonth: 7,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-financial-year",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-financial-year"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		registerCompanyActivity(
			{
				legalCompanyId,
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "MCMC",
				description: "Regulated software services",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-activity",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-activity"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);
	version = await expectSuccessAndRefreshCompanyVersion(
		setRegisteredAddress(
			{
				legalCompanyId,
				addressType: "registered_office",
				sourcePartyAddressId: "11111111-1111-4111-8111-111111111111",
				effectiveFrom: "2026-01-01",
				effectiveTo: null,
				sourceDocumentId: "doc-ca-real-address",
				expectedCompanyVersion: version,
			},
			commandOptions("idem-ca-real-address"),
			dependencies,
		),
		dependencies,
		legalCompanyId,
	);

	return { legalCompanyId, version };
}

async function expectSuccessAndRefreshCompanyVersion(
	resultPromise: Promise<Result<Readonly<{ version: number }>>>,
	dependencies: RealPackageDependencies,
	legalCompanyId: SeededLegalCompanyId,
): Promise<number> {
	const result = await resultPromise;
	if (!result.ok) {
		throw new Error(
			`${result.code}: ${result.message} ${JSON.stringify(result.details)}`,
		);
	}
	// biome-ignore lint/suspicious/noMisplacedAssertion: Shared journey helper is invoked only by test cases.
	expect(result.ok).toBe(true);
	const company = await dependencies.store.getLegalCompany({
		organizationId: organizationIdSchema.parse(session.orgId),
		legalCompanyId,
	});
	if (!company.ok || company.data === null) {
		throw new Error("Could not reload legal company aggregate version.");
	}
	return company.data.version;
}

function createRealPackageDependencies(): RealPackageDependencies {
	const store = createMemoryCorporateAdministrationLegalCompanyStore();
	const establishmentStore =
		createMemoryCorporateAdministrationEstablishmentStore();
	const referenceData = createReferenceData();
	return {
		store,
		companyStore: store,
		nameStore: store,
		legalFormStore: store,
		identifierStore: store,
		financialYearStore: store,
		activityStore: store,
		establishmentStore,
		jurisdictionRules: {
			listEntityTypeRules: async (input) =>
				ok([
					{
						jurisdictionCountryCode: input.jurisdictionCountryCode,
						entityTypes: ["draft_legal_company", "private_limited_company"],
						active: true,
					},
				]),
		},
		partyReferences: {
			getOrganizationParty: async (input) =>
				ok({
					partyId: input.partyId,
					kind: "organization",
					active: true,
				}),
		},
		referenceData,
		documentObjects: {
			resolveDocumentObject: async (input) =>
				ok({ documentObjectRef: input.documentObjectRef, active: true }),
		},
		taxRegistrations: {
			getTaxRegistrationById: async () => ok(null),
			findTaxRegistrationsForParty: async () => ok([]),
			findPotentialDuplicateTaxRegistration: async () => ok(null),
		},
		addressReferences: {
			getPartyAddress: async (input) =>
				ok({
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
				}),
		},
		runtime: {
			clock: createClock(),
			transaction: createInlineTransactionPort(),
			idempotency: createMemoryIdempotencyPort(),
			audit: createMemoryAuditPort(),
			outbox: createMemoryOutboxPort(),
		},
		createEventId: createEventIdGenerator(),
	};
}

function createReferenceData(): CompanyReferenceDataPort {
	const resolve = (code: string) =>
		ok({ code, active: true, displayName: code });
	return {
		resolveLanguage: async (input) => resolve(input.languageCode),
		validateLanguage: async (input) =>
			ok({ languageCode: input.languageCode, active: true }),
		resolveLegalForm: async (input) =>
			ok({
				code: input.legalFormCode,
				active: true,
				displayName: input.legalFormCode,
				jurisdictionCode: input.jurisdictionCode,
				legalFormCode: input.legalFormCode,
				effectiveDate: input.effectiveDate,
			}),
		validateLegalFormCompatibility: async () =>
			ok({ compatible: true, active: true }),
		listLegalFormCompatibilityRules: async (input) =>
			ok([
				{
					jurisdictionCode: input.jurisdictionCode,
					legalFormCodes: ["private_limited_company"],
					entityTypeCodes: ["private_limited_company"],
					active: true,
				},
			]),
		validateSourceDocument: async (input) =>
			ok({ sourceDocumentId: input.sourceDocumentId, active: true }),
		resolveCountry: async (input) => resolve(input.countryCode),
		resolveCurrency: async (input) =>
			ok({
				code: input.currencyCode,
				currencyCode: input.currencyCode,
				active: true,
				displayName: input.currencyCode,
				...(input.effectiveDate === undefined
					? {}
					: { effectiveDate: input.effectiveDate }),
			}),
		resolveIdentifierAuthority: async (input) =>
			ok({
				code: input.authorityCode,
				active: true,
				displayName: input.authorityCode,
				jurisdictionCode: input.jurisdictionCode,
				authorityCode: input.authorityCode,
				effectiveDate: input.effectiveDate,
				uniquenessScope: "tenant_authority",
				caseSensitive: false,
				removePresentationSeparators: true,
			}),
		resolveActivityClassification: async (input) =>
			ok({
				code: input.activityCode,
				active: true,
				displayName: input.activityCode,
				classificationSystem: input.classificationSystem,
				activityCode: input.activityCode,
				effectiveDate: input.effectiveDate,
				activityType:
					input.classificationSystem === "regulated_activity"
						? "regulated"
						: "registered_object",
				requiresRegulator: input.classificationSystem === "regulated_activity",
			}),
		resolveRegulator: async (input) => resolve(input.regulatorCode),
		resolveRegisteredActivity: async (input) => resolve(input.activityCode),
	};
}

function createOptions(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
}): CorporateAdministrationCommandOptions {
	return {
		organizationId: organizationIdSchema.parse(input.organizationId),
		actorUserId: userIdSchema.parse(input.actorUserId),
		correlationId: correlationIdSchema.parse(input.correlationId),
		idempotencyKey: idempotencyKeySchema.parse(input.idempotencyKey),
		authorization: {
			can: async () => true,
		},
	};
}

function createClock(): ClockPort {
	return {
		now: () => new Date("2026-07-01T00:00:00.000Z"),
		today: () => canonicalDateSchema.parse("2026-07-01"),
	};
}

function createInlineTransactionPort(): CorporateAdministrationTransactionPort {
	return {
		nesting: "prohibited",
		async run(work) {
			let statementCount = 0;
			const context: CorporateAdministrationTransactionContext = {
				enqueue: () => {
					statementCount += 1;
				},
				get statementCount() {
					return statementCount;
				},
			};
			const outcome = await work(context);
			return outcome.result;
		},
	};
}

function createMemoryIdempotencyPort(): CorporateAdministrationIdempotencyPort {
	const records = new Map<
		string,
		| Readonly<{
				status: "in_progress";
				fingerprint: CorporateAdministrationIdempotencyBeginInput["fingerprint"];
				token: Extract<
					CorporateAdministrationIdempotencyBeginOutcome,
					{ status: "acquired" }
				>["reservationToken"];
		  }>
		| Readonly<{
				status: "completed";
				fingerprint: CorporateAdministrationIdempotencyBeginInput["fingerprint"];
				result: CanonicalJsonValue;
		  }>
	>();
	let nextReservation = 0;
	return {
		async begin(
			input: CorporateAdministrationIdempotencyBeginInput,
		): Promise<Result<CorporateAdministrationIdempotencyBeginOutcome>> {
			const key = idempotencyKey(input);
			const existing = records.get(key);
			if (existing !== undefined) {
				if (existing.fingerprint !== input.fingerprint) {
					return await ok({
						status: "conflict",
						existingFingerprint: existing.fingerprint,
					});
				}
				if (existing.status === "completed") {
					return await ok({ status: "replay", result: existing.result });
				}
				return await ok({ status: "in_progress" });
			}
			nextReservation += 1;
			const token = idempotencyReservationTokenSchema.parse(
				`reservation_${nextReservation}`,
			);
			records.set(key, {
				status: "in_progress",
				fingerprint: input.fingerprint,
				token,
			});
			return await ok({ status: "acquired", reservationToken: token });
		},
		async complete(
			input: CorporateAdministrationIdempotencyCompletionInput,
		): Promise<Result<void>> {
			records.set(idempotencyKey(input), {
				status: "completed",
				fingerprint: input.fingerprint,
				result: input.result,
			});
			return await ok(undefined);
		},
		async release(
			input: CorporateAdministrationIdempotencyReleaseInput,
		): Promise<Result<void>> {
			records.delete(idempotencyKey(input));
			return await ok(undefined);
		},
	};
}

function createMemoryAuditPort(): CorporateAdministrationAuditFactPort {
	return {
		record: async (
			_input: CorporateAdministrationAuditFactInput,
		): Promise<Result<{ id: string }>> => ok({ id: "audit-ca-real" }),
	};
}

function createMemoryOutboxPort(): CorporateAdministrationOutboxPort {
	return {
		append: async (
			_events: readonly CorporateAdministrationPendingEvent[],
		): Promise<Result<void>> => ok(undefined),
	};
}

function idempotencyKey(input: {
	scope: CorporateAdministrationIdempotencyBeginInput["scope"];
}): string {
	return [
		input.scope.organizationId,
		input.scope.commandId,
		input.scope.idempotencyKey,
	].join("\u0000");
}

function createEventIdGenerator(): () => string {
	let next = 0;
	return () => {
		next += 1;
		return `event-ca-real-${next}`;
	};
}

function toLifecycleCompleteness(input: {
	complete: boolean;
	missing: readonly string[];
	hasJurisdictionProfile: boolean;
	hasLegalName: boolean;
	hasLegalForm: boolean;
	hasCompanyIdentifier: boolean;
	hasFinancialYear: boolean;
	hasRegisteredActivity: boolean;
	hasRegisteredAddress: boolean;
}): LegalCompanyActivationCompleteness {
	return {
		complete: input.complete,
		missing: input.missing,
		checks: [
			{
				key: "hasJurisdictionProfile",
				label: "Jurisdiction profile",
				complete: input.hasJurisdictionProfile,
			},
			{
				key: "hasLegalName",
				label: "English legal name",
				complete: input.hasLegalName,
			},
			{
				key: "hasLegalForm",
				label: "Legal form",
				complete: input.hasLegalForm,
			},
			{
				key: "hasCompanyIdentifier",
				label: "Company registration identifier",
				complete: input.hasCompanyIdentifier,
			},
			{
				key: "hasFinancialYear",
				label: "Financial year",
				complete: input.hasFinancialYear,
			},
			{
				key: "hasRegisteredActivity",
				label: "Registered activity",
				complete: input.hasRegisteredActivity,
			},
			{
				key: "hasRegisteredAddress",
				label: "Registered office",
				complete: input.hasRegisteredAddress,
			},
		],
	};
}

function toFormData(values: Readonly<Record<string, string>>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}
	return formData;
}
