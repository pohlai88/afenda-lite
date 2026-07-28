import { randomUUID } from "node:crypto";

import { createDrizzleAuditStore } from "@afenda/audit";
import {
	type AddressReferencePort,
	type ApprovalDecisionPort,
	type ClockPort,
	type CompanyActivityCommandDependencies,
	type CompanyActivityQueryDependencies,
	type CompanyFinancialYearCommandDependencies,
	type CompanyFinancialYearQueryDependencies,
	type CompanyIdentifierCommandDependencies,
	type CompanyIdentifierQueryDependencies,
	type CompanyJurisdictionRulePort,
	type CompanyLegalFormCommandDependencies,
	type CompanyNameCommandDependencies,
	type CompanyPartyReferencePort,
	type CompanyReferenceDataPort,
	type CorporateAdministrationCommandOptions,
	type CorporateAdministrationQueryOptions,
	canonicalDateSchema,
	correlationIdSchema,
	type DocumentObjectPort,
	type EstablishmentCommandDependencies,
	type EstablishmentQueryDependencies,
	idempotencyKeySchema,
	organizationIdSchema,
	type RegisterLegalCompanyDraftDependencies,
	type TaxRegistrationReadPort,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationEstablishmentStore,
	createDrizzleCorporateAdministrationLegalCompanyStore,
} from "@afenda/corporate-administration/adapters/drizzle";
import {
	and,
	asc,
	db,
	eq,
	mdParty,
	refCountry,
	runNeonHttpTransaction,
} from "@afenda/db";
import { ok } from "@afenda/errors/result";
import {
	findSensitiveTaxRegistrationsByParty,
	getPartyAddressById,
	getRefCountryByCode,
	getRefCurrencyByCode,
	getRefLanguageByCode,
	getSensitiveTaxRegistration,
	listPartyAddresses,
	listSensitiveTaxRegistrations,
	normalizeTaxRegistrationNumber,
} from "@afenda/master-data";
import { createCorporateAdministrationAuthorizationPort } from "@/lib/erp/corporate-administration-authorization-port";
import { createCorporateAdministrationAppRuntime } from "@/lib/erp/corporate-administration-runtime";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

const corporateAdministrationClock: ClockPort = {
	now: () => new Date(),
	today: (timeZoneIana) =>
		canonicalDateSchema.parse(
			new Intl.DateTimeFormat("en-CA", {
				timeZone: timeZoneIana,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).format(new Date()),
		),
};

const activeDraftJurisdictionRules: CompanyJurisdictionRulePort = {
	listEntityTypeRules: async (input) =>
		ok([
			{
				jurisdictionCountryCode: input.jurisdictionCountryCode,
				entityTypes: ["draft_legal_company", "private_limited_company"],
				active: true,
			},
		]),
};

const partyReferences: CompanyPartyReferencePort = {
	async getOrganizationParty(input) {
		const rows = await db
			.select({
				partyId: mdParty.id,
				partyKind: mdParty.partyKind,
				status: mdParty.status,
			})
			.from(mdParty)
			.where(
				and(
					eq(mdParty.organizationId, input.organizationId),
					eq(mdParty.id, input.partyId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (row === undefined) return ok(null);
		return ok({
			partyId: row.partyId,
			kind: row.partyKind === "organization" ? "organization" : "person",
			active: row.status === "active",
		});
	},
};

const referenceData: CompanyReferenceDataPort = {
	validateLanguage: async (input) =>
		getRefLanguageByCode(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-reference",
				code: input.languageCode,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		).then((result) =>
			result.ok
				? ok(
						result.data === null
							? null
							: { languageCode: result.data.code, active: result.data.active },
					)
				: result,
		),
	resolveLanguage: async (input) =>
		getRefLanguageByCode(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-reference",
				code: input.languageCode,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		).then((result) =>
			result.ok
				? ok(
						result.data === null
							? null
							: {
									code: result.data.code,
									active: result.data.active,
									displayName: result.data.name,
								},
					)
				: result,
		),
	validateSourceDocument: async (input) =>
		ok({ sourceDocumentId: input.sourceDocumentId, active: true }),
	resolveLegalForm: async (input) =>
		ok({
			code: input.legalFormCode,
			active: true,
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
	resolveCountry: async (input) =>
		getRefCountryByCode(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-reference",
				code: input.countryCode,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		).then((result) =>
			result.ok
				? ok(
						result.data === null
							? null
							: {
									code: result.data.code,
									active: result.data.active,
									displayName: result.data.name,
								},
					)
				: result,
		),
	resolveCurrency: async (input) =>
		getRefCurrencyByCode(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-reference",
				code: input.currencyCode,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		).then((result) =>
			result.ok
				? ok(
						result.data === null
							? null
							: {
									code: result.data.code,
									currencyCode: result.data.code,
									active: result.data.active,
									displayName: result.data.name,
									effectiveDate: input.effectiveDate,
								},
					)
				: result,
		),
	resolveIdentifierAuthority: async (input) =>
		ok({
			code: input.authorityCode,
			active: true,
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
			classificationSystem: input.classificationSystem,
			activityCode: input.activityCode,
			effectiveDate: input.effectiveDate,
			requiresRegulator: input.classificationSystem === "regulated_activity",
		}),
	resolveRegulator: async (input) =>
		ok({
			code: input.regulatorCode,
			active: true,
			displayName: input.regulatorCode,
		}),
	resolveRegisteredActivity: async (input) =>
		ok({ code: input.activityCode, active: true }),
};

const documentObjects: DocumentObjectPort = {
	resolveDocumentObject: async (input) =>
		ok({
			documentObjectRef: input.documentObjectRef,
			active: true,
		}),
};

const addressReferences: AddressReferencePort = {
	async getPartyAddress(input) {
		const result = await getPartyAddressById(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-address-reference",
				partyId: input.partyId,
				id: input.partyAddressId,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!result.ok) return result;
		if (result.data === null) return ok(null);
		const countries = await db
			.select({ code: refCountry.code })
			.from(refCountry)
			.where(eq(refCountry.id, result.data.countryId))
			.limit(1);
		const country = countries[0];
		if (country === undefined) return ok(null);
		const activeFrom = result.data.effectiveFrom?.toISOString().slice(0, 10);
		const activeTo = result.data.effectiveTo?.toISOString().slice(0, 10);
		return ok({
			organizationId: organizationIdSchema.parse(result.data.organizationId),
			partyId: result.data.partyId,
			active:
				result.data.status === "active" &&
				result.data.archivedAt === null &&
				(activeFrom === undefined || activeFrom <= input.asOf) &&
				(activeTo === undefined || input.asOf < activeTo),
			sourcePartyAddressId: result.data.id,
			line1: result.data.line1,
			line2: result.data.line2,
			city: result.data.city,
			region: result.data.administrativeArea,
			postalCode: result.data.postalCode,
			countryCode: country.code,
		});
	},
};

const taxRegistrations: TaxRegistrationReadPort = {
	getTaxRegistrationById: async (input) => {
		const result = await getSensitiveTaxRegistration(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-tax-reference",
				id: input.taxRegistrationId,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!result.ok) return result;
		return ok(result.data === null ? null : toTaxReadModel(result.data));
	},
	findTaxRegistrationsForParty: async (input) => {
		const result = await findSensitiveTaxRegistrationsByParty(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-tax-reference",
				partyId: input.partyId,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!result.ok) return result;
		return ok(result.data.map(toTaxReadModel));
	},
	findPotentialDuplicateTaxRegistration: async (input) => {
		const normalized = normalizeTaxRegistrationNumber(
			input.normalizedRegistrationNumber,
		);
		if (!normalized.ok) return ok(null);
		const result = await listSensitiveTaxRegistrations(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-tax-reference",
				page: 1,
				pageSize: 50,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!result.ok) return result;
		const duplicate =
			result.data.find(
				(row) =>
					row.countryId === input.jurisdictionCode &&
					row.taxType === input.registrationType &&
					normalizedTaxRegistrationNumber(row.registrationNumber) ===
						normalized.data.normalizedRegistrationNumber,
			) ?? null;
		return ok(duplicate === null ? null : toTaxReadModel(duplicate));
	},
};

export function createCorporateAdministrationApprovalDecisionPort(): ApprovalDecisionPort {
	return {
		verify: async () => ok(null),
	};
}

export function createCorporateAdministrationCommandOptions(input: {
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
		authorization: createCorporateAdministrationAuthorizationPort(),
	};
}

export function createCorporateAdministrationQueryOptions(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
}): CorporateAdministrationQueryOptions {
	return {
		organizationId: organizationIdSchema.parse(input.organizationId),
		actorUserId: userIdSchema.parse(input.actorUserId),
		correlationId: correlationIdSchema.parse(input.correlationId),
		authorization: createCorporateAdministrationAuthorizationPort(),
	};
}

export function createCorporateAdministrationLegalCompanyDependencies(): RegisterLegalCompanyDraftDependencies {
	return createCorporateAdministrationCompanyDependencies();
}

export function createCorporateAdministrationCompanyDependencies(): RegisterLegalCompanyDraftDependencies &
	CompanyNameCommandDependencies &
	CompanyLegalFormCommandDependencies &
	CompanyIdentifierCommandDependencies &
	CompanyFinancialYearCommandDependencies &
	CompanyActivityCommandDependencies &
	CompanyIdentifierQueryDependencies &
	CompanyFinancialYearQueryDependencies &
	CompanyActivityQueryDependencies &
	EstablishmentCommandDependencies &
	EstablishmentQueryDependencies &
	Readonly<{
		addressReferences: AddressReferencePort;
		documentObjects: DocumentObjectPort;
		taxRegistrations: TaxRegistrationReadPort;
	}> {
	const store = createDrizzleCorporateAdministrationLegalCompanyStore({
		database: db,
		createLegalCompanyId: randomUUID,
	});
	const establishmentStore =
		createDrizzleCorporateAdministrationEstablishmentStore({
			database: db,
			createId: randomUUID,
		});

	return {
		store,
		companyStore: store,
		establishmentStore,
		addressReferences,
		nameStore: store,
		legalFormStore: store,
		identifierStore: store,
		financialYearStore: store,
		activityStore: store,
		jurisdictionRules: activeDraftJurisdictionRules,
		partyReferences,
		referenceData,
		documentObjects,
		taxRegistrations,
		runtime: createCorporateAdministrationAppRuntime({
			clock: corporateAdministrationClock,
			database: db,
			auditStore: createDrizzleAuditStore(),
			executeTransaction: (buildQueries) =>
				runNeonHttpTransaction(buildQueries),
			executeOutboxTransaction: (buildQueries) =>
				runNeonHttpTransaction(buildQueries),
			createReservationToken: randomUUID,
			createAuditId: randomUUID,
		}),
		createEventId: randomUUID,
	};
}

function toTaxReadModel(input: {
	id: string;
	organizationId: string;
	partyId: string;
	countryId: string;
	taxType: string;
	registrationNumber: string;
	status: string;
	validFrom: Date | null;
	validUntil: Date | null;
}) {
	return {
		id: input.id,
		organizationId: organizationIdSchema.parse(input.organizationId),
		partyId: input.partyId,
		jurisdictionCode: input.countryId,
		registrationType: input.taxType,
		displayRegistrationNumber: input.registrationNumber,
		normalizedRegistrationNumber: normalizedTaxRegistrationNumber(
			input.registrationNumber,
		),
		status: input.status,
		effectiveFrom:
			input.validFrom === null
				? null
				: canonicalDateSchema.parse(input.validFrom.toISOString().slice(0, 10)),
		effectiveTo:
			input.validUntil === null
				? null
				: canonicalDateSchema.parse(
						input.validUntil.toISOString().slice(0, 10),
					),
	};
}

function normalizedTaxRegistrationNumber(value: string): string {
	const normalized = normalizeTaxRegistrationNumber(value);
	if (!normalized.ok) {
		throw new Error("Invalid tax registration projection");
	}
	return normalized.data.normalizedRegistrationNumber;
}

export async function listCorporateAdministrationActiveOrganizationParties(input: {
	organizationId: string;
}): Promise<readonly { id: string; code: string; name: string }[]> {
	return db
		.select({
			id: mdParty.id,
			code: mdParty.code,
			name: mdParty.name,
		})
		.from(mdParty)
		.where(
			and(
				eq(mdParty.organizationId, input.organizationId),
				eq(mdParty.partyKind, "organization"),
				eq(mdParty.status, "active"),
			),
		)
		.orderBy(asc(mdParty.normalizedCode))
		.limit(50);
}

export async function listCorporateAdministrationPartyAddresses(input: {
	organizationId: string;
	actorUserId: string;
	partyId: string;
}): Promise<
	readonly {
		id: string;
		label: string;
	}[]
> {
	const result = await listPartyAddresses(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			parentId: input.partyId,
			page: 1,
			pageSize: 100,
		},
		{ authorization: createMasterDataAuthorizationPort() },
	);
	if (!result.ok) return [];
	return result.data.map((address) => ({
		id: address.id,
		label: [address.line1, address.city, address.postalCode]
			.filter((part) => part !== null && part.length > 0)
			.join(", "),
	}));
}
