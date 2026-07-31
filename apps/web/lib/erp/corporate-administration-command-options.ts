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
	mdPartyAddress,
	refCountry,
	refCurrency,
	refLanguage,
	runNeonHttpTransaction,
} from "@afenda/db";
import { errorResult } from "@afenda/errors";
import {
	findSensitiveTaxRegistrationsByParty,
	getSensitiveTaxRegistration,
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
		errorResult.ok([
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
		const [row] = rows;
		if (row === undefined) {
			return errorResult.ok(null);
		}
		return errorResult.ok({
			partyId: row.partyId,
			kind: row.partyKind === "organization" ? "organization" : "person",
			active: row.status === "active",
		});
	},
};

const referenceData: CompanyReferenceDataPort = {
	validateLanguage: async (input) => {
		const rows = await db
			.select({
				code: refLanguage.code,
				active: refLanguage.active,
			})
			.from(refLanguage)
			.where(eq(refLanguage.code, input.languageCode))
			.limit(1);
		const [row] = rows;
		return errorResult.ok(
			row === undefined ? null : { languageCode: row.code, active: row.active },
		);
	},
	resolveLanguage: async (input) => {
		const rows = await db
			.select({
				code: refLanguage.code,
				active: refLanguage.active,
				displayName: refLanguage.name,
			})
			.from(refLanguage)
			.where(eq(refLanguage.code, input.languageCode))
			.limit(1);
		return errorResult.ok(rows[0] ?? null);
	},
	validateSourceDocument: async (input) =>
		errorResult.ok({ sourceDocumentId: input.sourceDocumentId, active: true }),
	resolveLegalForm: async (input) =>
		errorResult.ok({
			code: input.legalFormCode,
			active: true,
			jurisdictionCode: input.jurisdictionCode,
			legalFormCode: input.legalFormCode,
			effectiveDate: input.effectiveDate,
		}),
	validateLegalFormCompatibility: async () =>
		errorResult.ok({ compatible: true, active: true }),
	listLegalFormCompatibilityRules: async (input) =>
		errorResult.ok([
			{
				jurisdictionCode: input.jurisdictionCode,
				legalFormCodes: ["private_limited_company"],
				entityTypeCodes: ["private_limited_company"],
				active: true,
			},
		]),
	resolveCountry: async (input) => {
		const rows = await db
			.select({
				code: refCountry.code,
				active: refCountry.active,
				displayName: refCountry.name,
			})
			.from(refCountry)
			.where(eq(refCountry.code, input.countryCode))
			.limit(1);
		return errorResult.ok(rows[0] ?? null);
	},
	resolveCurrency: async (input) => {
		const rows = await db
			.select({
				code: refCurrency.code,
				currencyCode: refCurrency.code,
				active: refCurrency.active,
				displayName: refCurrency.name,
			})
			.from(refCurrency)
			.where(eq(refCurrency.code, input.currencyCode))
			.limit(1);
		const [row] = rows;
		return errorResult.ok(
			row === undefined
				? null
				: {
						...row,
						...(input.effectiveDate === undefined
							? {}
							: { effectiveDate: input.effectiveDate }),
					},
		);
	},
	resolveIdentifierAuthority: async (input) =>
		errorResult.ok({
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
		errorResult.ok({
			code: input.activityCode,
			active: true,
			classificationSystem: input.classificationSystem,
			activityCode: input.activityCode,
			effectiveDate: input.effectiveDate,
			requiresRegulator: input.classificationSystem === "regulated_activity",
		}),
	resolveRegulator: async (input) =>
		errorResult.ok({
			code: input.regulatorCode,
			active: true,
			displayName: input.regulatorCode,
		}),
	resolveRegisteredActivity: async (input) =>
		errorResult.ok({ code: input.activityCode, active: true }),
};

const documentObjects: DocumentObjectPort = {
	resolveDocumentObject: async (input) =>
		errorResult.ok({
			documentObjectRef: input.documentObjectRef,
			active: true,
		}),
};

const addressReferences: AddressReferencePort = {
	async getPartyAddress(input) {
		const rows = await db
			.select({
				organizationId: mdPartyAddress.organizationId,
				partyId: mdPartyAddress.partyId,
				id: mdPartyAddress.id,
				line1: mdPartyAddress.line1,
				line2: mdPartyAddress.line2,
				city: mdPartyAddress.city,
				administrativeArea: mdPartyAddress.administrativeArea,
				postalCode: mdPartyAddress.postalCode,
				status: mdPartyAddress.status,
				archivedAt: mdPartyAddress.archivedAt,
				effectiveFrom: mdPartyAddress.effectiveFrom,
				effectiveTo: mdPartyAddress.effectiveTo,
				countryCode: refCountry.code,
			})
			.from(mdPartyAddress)
			.innerJoin(refCountry, eq(refCountry.id, mdPartyAddress.countryId))
			.where(
				and(
					eq(mdPartyAddress.organizationId, input.organizationId),
					eq(mdPartyAddress.partyId, input.partyId),
					eq(mdPartyAddress.id, input.partyAddressId),
				),
			)
			.limit(1);
		const [row] = rows;
		if (row === undefined) {
			return errorResult.ok(null);
		}
		const activeFrom = row.effectiveFrom?.toISOString().slice(0, 10);
		const activeTo = row.effectiveTo?.toISOString().slice(0, 10);
		return errorResult.ok({
			organizationId: organizationIdSchema.parse(row.organizationId),
			partyId: row.partyId,
			active:
				row.status === "active" &&
				row.archivedAt === null &&
				(activeFrom === undefined || activeFrom <= input.asOf) &&
				(activeTo === undefined || input.asOf < activeTo),
			sourcePartyAddressId: row.id,
			line1: row.line1,
			line2: row.line2,
			city: row.city,
			region: row.administrativeArea,
			postalCode: row.postalCode,
			countryCode: row.countryCode,
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
		if (!result.ok) {
			return result;
		}
		return errorResult.ok(
			result.data === null ? null : toTaxReadModel(result.data),
		);
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
		if (!result.ok) {
			return result;
		}
		return errorResult.ok(result.data.map(toTaxReadModel));
	},
	findPotentialDuplicateTaxRegistration: async (input) => {
		const normalized = normalizeTaxRegistrationNumber(
			input.normalizedRegistrationNumber,
		);
		if (!normalized.ok) {
			return errorResult.ok(null);
		}
		const result = await listSensitiveTaxRegistrations(
			{
				organizationId: input.organizationId,
				actorUserId: "system-ca-tax-reference",
				page: 1,
				pageSize: 50,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		if (!result.ok) {
			return result;
		}
		const duplicate =
			result.data.find(
				(row) =>
					row.countryId === input.jurisdictionCode &&
					row.taxType === input.registrationType &&
					normalizedTaxRegistrationNumber(row.registrationNumber) ===
						normalized.data.normalizedRegistrationNumber,
			) ?? null;
		return errorResult.ok(
			duplicate === null ? null : toTaxReadModel(duplicate),
		);
	},
};

export function createCorporateAdministrationApprovalDecisionPort(): ApprovalDecisionPort {
	return {
		verify: async () => errorResult.ok(null),
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
	return await db
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
	const rows = await db
		.select({
			id: mdPartyAddress.id,
			line1: mdPartyAddress.line1,
			city: mdPartyAddress.city,
			postalCode: mdPartyAddress.postalCode,
		})
		.from(mdPartyAddress)
		.where(
			and(
				eq(mdPartyAddress.organizationId, input.organizationId),
				eq(mdPartyAddress.partyId, input.partyId),
				eq(mdPartyAddress.status, "active"),
			),
		)
		.orderBy(asc(mdPartyAddress.line1))
		.limit(100);
	return rows.map((address) => ({
		id: address.id,
		label: [address.line1, address.city, address.postalCode]
			.filter((part) => part !== null && part.length > 0)
			.join(", "),
	}));
}
