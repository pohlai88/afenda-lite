// biome-ignore-all lint/suspicious/useAwait: Deterministic fixtures implement asynchronous company ports.
import { randomUUID } from "node:crypto";
import {
	type CompanyJurisdictionProfile,
	type CompanyJurisdictionRulePort,
	type CompanyPartyReferencePort,
	type CompanyReferenceDataPort,
	type CorporateAdministrationCommandOptions,
	type CorporateAdministrationQueryOptions,
	correlationIdSchema,
	idempotencyKeySchema,
	type LegalCompanyStore,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationAuditFactPort,
	createDrizzleCorporateAdministrationIdempotencyPort,
	createDrizzleCorporateAdministrationLegalCompanyStore,
	createDrizzleCorporateAdministrationOutboxPort,
	createDrizzleCorporateAdministrationTransactionPort,
} from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import {
	caCompanyJurisdictionProfile,
	caLegalCompany,
	db,
	eq,
	platformAuditLog,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";
import { createFixedCorporateAdministrationClock } from "./fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./inline-transaction";
import { createMemoryCorporateAdministrationAuditFactPort } from "./memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./memory-outbox";
import { createNeonCorporateAdministrationPendingEventAppender } from "./neon-cleanup";

export const caTestActorUserId = userIdSchema.parse("user-ca-company-test");

export function uniqueCaOrganizationId(prefix: string) {
	return organizationIdSchema.parse(`org-${prefix}-${randomUUID()}`);
}

export function caCommandOptions(input?: {
	organizationId?: string;
	allowed?: boolean;
	idempotencyKey?: string;
	correlationId?: string;
}): CorporateAdministrationCommandOptions {
	return {
		organizationId: organizationIdSchema.parse(
			input?.organizationId ?? `org-ca-${randomUUID()}`,
		),
		actorUserId: caTestActorUserId,
		correlationId: correlationIdSchema.parse(
			input?.correlationId ?? `corr-${randomUUID()}`,
		),
		idempotencyKey: idempotencyKeySchema.parse(
			input?.idempotencyKey ?? `idem-${randomUUID()}`,
		),
		authorization: {
			can: async () => input?.allowed ?? true,
		},
	};
}

export function caQueryOptions(input?: {
	organizationId?: string;
	allowed?: boolean;
	correlationId?: string;
}): CorporateAdministrationQueryOptions {
	return {
		organizationId: organizationIdSchema.parse(
			input?.organizationId ?? `org-ca-${randomUUID()}`,
		),
		actorUserId: caTestActorUserId,
		correlationId: correlationIdSchema.parse(
			input?.correlationId ?? `corr-${randomUUID()}`,
		),
		authorization: {
			can: async () => input?.allowed ?? true,
		},
	};
}

export function caRulePort(input?: {
	active?: boolean;
	entityTypes?: readonly string[];
}): CompanyJurisdictionRulePort {
	return {
		listEntityTypeRules: async () =>
			ok([
				{
					jurisdictionCountryCode: "MY",
					entityTypes: input?.entityTypes ?? [
						"draft_legal_company",
						"private_limited_company",
					],
					active: input?.active ?? true,
				},
			]),
	};
}

export function caPartyPort(input?: {
	active?: boolean;
	kind?: "organization" | "person";
}): CompanyPartyReferencePort {
	return {
		getOrganizationParty: async (request) =>
			ok({
				partyId: request.partyId,
				kind: input?.kind ?? "organization",
				active: input?.active ?? true,
			}),
	};
}

export function caReferenceDataPort(input?: {
	languageActive?: boolean;
	sourceDocumentActive?: boolean;
	legalFormActive?: boolean;
	compatible?: boolean;
}): CompanyReferenceDataPort {
	return {
		validateLanguage: async (request) =>
			ok({
				languageCode: request.languageCode,
				active: input?.languageActive ?? true,
			}),
		resolveLanguage: async (request) =>
			ok({
				code: request.languageCode,
				active: input?.languageActive ?? true,
			}),
		validateSourceDocument: async (request) =>
			ok({
				sourceDocumentId: request.sourceDocumentId,
				active: input?.sourceDocumentActive ?? true,
			}),
		resolveLegalForm: async (request) =>
			ok({
				code: request.legalFormCode,
				active: input?.legalFormActive ?? true,
				jurisdictionCode: request.jurisdictionCode,
				legalFormCode: request.legalFormCode,
				effectiveDate: request.effectiveDate,
			}),
		validateLegalFormCompatibility: async () =>
			ok({
				compatible: input?.compatible ?? true,
				active: true,
			}),
		resolveCountry: async (request) =>
			ok({
				code: request.countryCode,
				active: true,
				effectiveDate: request.effectiveDate,
			}),
		resolveCurrency: async (request) =>
			ok({
				code: request.currencyCode,
				currencyCode: request.currencyCode,
				active: true,
				effectiveDate: request.effectiveDate,
			}),
		resolveIdentifierAuthority: async (request) =>
			ok({
				code: request.authorityCode,
				active: true,
				jurisdictionCode: request.jurisdictionCode,
				authorityCode: request.authorityCode,
				effectiveDate: request.effectiveDate,
				uniquenessScope: "tenant_authority",
				caseSensitive: false,
				removePresentationSeparators: true,
			}),
		resolveActivityClassification: async (request) =>
			ok({
				code: request.activityCode,
				active: true,
				classificationSystem: request.classificationSystem,
				activityCode: request.activityCode,
				effectiveDate: request.effectiveDate,
				activityType: "registered_object",
				requiresRegulator: false,
			}),
		resolveRegulator: async (request) =>
			ok({
				code: request.regulatorCode,
				active: true,
				displayName: request.regulatorCode,
			}),
		resolveRegisteredActivity: async (request) =>
			ok({
				code: request.activityCode,
				active: true,
			}),
		listLegalFormCompatibilityRules: async () =>
			ok([
				{
					jurisdictionCode: "MY",
					legalFormCodes: ["private_limited_company"],
					entityTypeCodes: ["private_limited_company"],
					active: true,
				},
			]),
	};
}

export function caDraftInput(input?: {
	companyCode?: string;
	masterDataPartyId?: string;
}) {
	return {
		companyCode: input?.companyCode ?? `af-${randomUUID().slice(0, 8)}`,
		displayName: "Afenda Malaysia",
		masterDataPartyId: input?.masterDataPartyId ?? "party-1",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "test-register-draft",
	};
}

export function caJurisdictionProfileInput(input: {
	legalCompanyId: string;
	expectedCompanyVersion: number;
	from?: string;
	to?: string | null;
	recordedAt?: string;
	entityType?: string;
	sourceReference?: string;
}) {
	return {
		legalCompanyId: input.legalCompanyId,
		jurisdictionCountryCode: "MY",
		entityType: input.entityType ?? "private_limited_company",
		effectiveRange: {
			from: input.from ?? "2026-01-01",
			to: input.to ?? null,
		},
		recordedAt: input.recordedAt ?? "2026-07-26T10:00:00.000Z",
		sourceReference: input.sourceReference ?? "test-jurisdiction-profile",
		expectedCompanyVersion: input.expectedCompanyVersion,
	};
}

export function caSupersedeInput(input: {
	legalCompanyId: string;
	jurisdictionProfileId: string;
	expectedProfileVersion: number;
	from?: string;
	to?: string | null;
	recordedAt?: string;
}) {
	return {
		legalCompanyId: input.legalCompanyId,
		jurisdictionProfileId: input.jurisdictionProfileId,
		expectedProfileVersion: input.expectedProfileVersion,
		replacement: {
			jurisdictionCountryCode: "MY",
			entityType: "private_limited_company",
			effectiveRange: {
				from: input.from ?? "2027-01-01",
				to: input.to ?? null,
			},
			recordedAt: input.recordedAt ?? "2026-07-26T11:00:00.000Z",
			sourceReference: "test-supersede-profile",
		},
	};
}

export function createMemoryCompanyDependencies(input?: {
	store?: LegalCompanyStore;
	audits?: unknown[];
	events?: unknown[];
}) {
	const store =
		input?.store ?? createMemoryCorporateAdministrationLegalCompanyStore();
	return {
		store,
		jurisdictionRules: caRulePort(),
		partyReferences: caPartyPort(),
		referenceData: caReferenceDataPort(),
		createEventId: () => `event-${randomUUID()}`,
		runtime: {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T10:00:00.000Z",
			),
			transaction: createInlineCorporateAdministrationTransactionPort(),
			idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
			audit: createMemoryCorporateAdministrationAuditFactPort({
				onRecord: (fact) => input?.audits?.push(fact),
			}),
			outbox: createMemoryCorporateAdministrationOutboxPort({
				onAppend: (events) => input?.events?.push(...events),
			}),
		},
	};
}

export function createDrizzleCompanyDependencies() {
	return {
		store: createDrizzleCorporateAdministrationLegalCompanyStore({
			database: db,
			createLegalCompanyId: randomUUID,
		}),
		jurisdictionRules: caRulePort(),
		partyReferences: caPartyPort(),
		referenceData: caReferenceDataPort(),
		createEventId: randomUUID,
		runtime: {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T10:00:00.000Z",
			),
			transaction: createDrizzleCorporateAdministrationTransactionPort({
				execute: (buildQueries) => runNeonHttpTransaction(buildQueries),
			}),
			idempotency: createDrizzleCorporateAdministrationIdempotencyPort({
				database: db,
				createReservationToken: randomUUID,
				now: () => new Date("2026-07-26T10:00:00.000Z"),
			}),
			audit: createDrizzleCorporateAdministrationAuditFactPort({
				store: {
					write: async () => {
						throw new Error(
							"Transactional audit must use transaction context.",
						);
					},
				},
				createAuditId: randomUUID,
			}),
			outbox: createDrizzleCorporateAdministrationOutboxPort({
				appender: createNeonCorporateAdministrationPendingEventAppender(),
			}),
		},
	};
}

export function expectOk<T>(
	result: { ok: true; data: T } | { ok: false },
): asserts result is { ok: true; data: T } {
	if (!result.ok) {
		throw new Error("Expected successful Corporate Administration result.");
	}
}

export function expectFailureCode(
	result: { ok: true } | { ok: false; code: string },
	code: string,
): void {
	if (result.ok || result.code !== code) {
		throw new Error(`Expected Corporate Administration failure code ${code}.`);
	}
}

export function profileIdentity(profile: CompanyJurisdictionProfile) {
	return {
		legalCompanyId: profile.legalCompanyId,
		jurisdictionCountryCode: profile.jurisdictionCountryCode,
		entityType: profile.entityType,
		effectiveRange: {
			from: profile.effectiveRange.from,
			to: profile.effectiveRange.to,
		},
	};
}

export async function countCaLegalCompanies(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caLegalCompany)
		.where(eq(caLegalCompany.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCaJurisdictionProfiles(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(caCompanyJurisdictionProfile)
		.where(eq(caCompanyJurisdictionProfile.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export async function countCaAuditFacts(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(platformAuditLog)
		.where(eq(platformAuditLog.organizationId, organizationId));
	return Number(rows[0]?.value ?? 0);
}

export function failingOutboxPort(): {
	append: () => Promise<Result<void>>;
} {
	return {
		append: async () => ({
			ok: false,
			code: "SERVICE_UNAVAILABLE",
			message: "Injected Corporate Administration outbox failure.",
		}),
	};
}
