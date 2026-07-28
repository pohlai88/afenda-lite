import {
	and,
	asc,
	caCompanyActivity,
	caCompanyFinancialYear,
	caCompanyIdentifier,
	caCompanyJurisdictionProfile,
	caCompanyLegalFormHistory,
	caCompanyName,
	caCompanyStatusHistory,
	caLegalCompany,
	desc,
	eq,
	inArray,
	ne,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import { isVisibleAtKnownTime, matchesAsOf } from "../../company/rules";
import { legalCompanyStatusSchema } from "../../company/schemas";
import type {
	CompaniesByStatusQuery,
	CompanyActivitiesAsOfQuery,
	CompanyActivityStore,
	CompanyFinancialYearOverlapQuery,
	CompanyFinancialYearStore,
	CompanyIdentifierListQuery,
	CompanyIdentifierOverlapQuery,
	CompanyIdentifierStore,
	CompanyLegalFormOverlapQuery,
	CompanyLegalFormStore,
	CompanyNameListPage,
	CompanyNameOverlapQuery,
	CompanyNameStore,
	LegalCompanyStore,
} from "../../company/store";
import type {
	CompanyActivity,
	CompanyFinancialYear,
	CompanyIdentifier,
	CompanyIdentifierListItem,
	CompanyIdentifierListPage,
	CompanyJurisdictionProfile,
	CompanyLegalFormHistory,
	CompanyName,
	CompanyNameListItem,
	CompanyStatusHistory,
	LegalCompany,
	LegalCompanyListItem,
	LegalCompanyListPage,
	LegalCompanyTimelineEntry,
} from "../../company/types";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import {
	companyActivityIdSchema,
	companyFinancialYearIdSchema,
	companyIdentifierIdSchema,
	companyLegalFormHistoryIdSchema,
	companyNameIdSchema,
	legalCompanyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema, toCanonicalInstant } from "../../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../../ports";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationDrizzleLegalCompanyDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createLegalCompanyId: () => string;
}>;

export function createDrizzleCorporateAdministrationLegalCompanyStore(
	dependencies: CorporateAdministrationDrizzleLegalCompanyDependencies,
): LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore {
	return new DrizzleCorporateAdministrationLegalCompanyStore(dependencies);
}

class DrizzleCorporateAdministrationLegalCompanyStore
	implements
		LegalCompanyStore,
		CompanyNameStore,
		CompanyLegalFormStore,
		CompanyIdentifierStore,
		CompanyFinancialYearStore,
		CompanyActivityStore
{
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createLegalCompanyId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleLegalCompanyDependencies,
	) {
		this.#database = dependencies.database;
		this.#createLegalCompanyId = dependencies.createLegalCompanyId;
	}

	async getLegalCompany(
		input: Parameters<LegalCompanyStore["getLegalCompany"]>[0],
	): Promise<Result<LegalCompany | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caLegalCompany)
				.where(
					and(
						eq(caLegalCompany.organizationId, input.organizationId),
						eq(caLegalCompany.id, input.legalCompanyId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const company = mapLegalCompanyRow(row);
			if (!company.ok) {
				return company;
			}
			const currentJurisdictionProfile = await this.findJurisdictionProfileAsOf(
				{
					organizationId: input.organizationId,
					legalCompanyId: company.data.legalCompanyId,
					asOf: canonicalDateSchema.parse("9999-12-31"),
					knownAt: input.knownAt,
				},
			);
			if (!currentJurisdictionProfile.ok) {
				return currentJurisdictionProfile;
			}
			return ok({
				...company.data,
				currentJurisdictionProfile: currentJurisdictionProfile.data,
			});
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listLegalCompanies(
		input: Parameters<LegalCompanyStore["listLegalCompanies"]>[0],
	): Promise<Result<LegalCompanyListPage>> {
		try {
			const rows = await this.#database
				.select()
				.from(caLegalCompany)
				.where(eq(caLegalCompany.organizationId, input.organizationId))
				.orderBy(asc(caLegalCompany.normalizedCompanyCode))
				.limit(input.pagination.limit);
			const items: LegalCompanyListItem[] = [];
			for (const row of rows) {
				const company = mapLegalCompanyRow(row);
				if (!company.ok) {
					return company;
				}
				items.push({
					organizationId: company.data.organizationId,
					legalCompanyId: company.data.legalCompanyId,
					companyCode: company.data.companyCode,
					normalizedCompanyCode: company.data.normalizedCompanyCode,
					masterDataPartyId: company.data.masterDataPartyId,
					homeJurisdictionCountryCode: company.data.homeJurisdictionCountryCode,
					state: company.data.state,
					profile: company.data.profile,
					version: company.data.version,
					jurisdictionCountryCode: company.data.homeJurisdictionCountryCode,
					entityType: "draft_legal_company",
				});
			}
			return ok({ items, nextCursor: null });
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async registerLegalCompanyDraft(
		input: Parameters<LegalCompanyStore["registerLegalCompanyDraft"]>[0],
	): Promise<Result<LegalCompany>> {
		const legalCompanyId = legalCompanyIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const company: LegalCompany = {
			organizationId: input.organizationId,
			legalCompanyId,
			companyCode: input.companyCode,
			normalizedCompanyCode: input.normalizedCompanyCode,
			masterDataPartyId: input.masterDataPartyId,
			homeJurisdictionCountryCode: input.homeJurisdictionCountryCode,
			state: "draft",
			profile: {
				displayName: input.displayName,
				sourceReference: input.sourceReference,
			},
			currentJurisdictionProfile: null,
			createdByUserId: input.createdByUserId,
			updatedByUserId: input.createdByUserId,
			createdAt: input.createdAt,
			updatedAt: input.createdAt,
			version: 1,
		};

		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					INSERT INTO ca_legal_company (
						id,
						organization_id,
						company_code,
						normalized_company_code,
						display_name,
						master_data_party_id,
						home_jurisdiction_country_code,
						state,
						created_by,
						updated_by,
						version,
						created_at,
						updated_at
					)
					VALUES (
						${legalCompanyId},
						${input.organizationId},
						${input.companyCode},
						${input.normalizedCompanyCode},
						${input.displayName},
						${input.masterDataPartyId},
						${input.homeJurisdictionCountryCode},
						'draft',
						${input.createdByUserId},
						${input.createdByUserId},
						1,
						${input.createdAt},
						${input.createdAt}
					)
				`;
			});
			return ok(company);
		}

		try {
			const rows = await this.#database
				.insert(caLegalCompany)
				.values({
					id: legalCompanyId,
					organizationId: input.organizationId,
					companyCode: input.companyCode,
					normalizedCompanyCode: input.normalizedCompanyCode,
					displayName: input.displayName,
					masterDataPartyId: input.masterDataPartyId,
					homeJurisdictionCountryCode: input.homeJurisdictionCountryCode,
					state: "draft",
					createdBy: input.createdByUserId,
					updatedBy: input.createdByUserId,
					version: 1,
					createdAt: new Date(input.createdAt),
					updatedAt: new Date(input.createdAt),
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration legal company persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapLegalCompanyRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async updateLegalCompanyProfile(
		input: Parameters<LegalCompanyStore["updateLegalCompanyProfile"]>[0],
	) {
		if (input.transaction !== undefined) {
			const current = await this.getLegalCompany(input);
			if (!current.ok) return current;
			if (current.data === null) {
				return fail(
					"NOT_FOUND",
					"Corporate Administration legal company was not found.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_NOT_FOUND",
						{ entityType: "legalCompany" },
					),
				);
			}
			const updated: LegalCompany = {
				...current.data,
				profile: input.profile,
				updatedByUserId: input.actorUserId,
				updatedAt: toCanonicalInstant(new Date()),
				version: input.expectedVersion + 1,
			};
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					UPDATE ca_legal_company
					SET
						display_name = ${input.profile.displayName},
						updated_by = ${input.actorUserId},
						updated_at = now(),
						version = ${input.expectedVersion + 1}
					WHERE
						organization_id = ${input.organizationId}
						AND id = ${input.legalCompanyId}
						AND version = ${input.expectedVersion}
				`;
			});
			return ok(updated);
		}

		try {
			const rows = await this.#database
				.update(caLegalCompany)
				.set({
					displayName: input.profile.displayName,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
					version: input.expectedVersion + 1,
				})
				.where(
					and(
						eq(caLegalCompany.organizationId, input.organizationId),
						eq(caLegalCompany.id, input.legalCompanyId),
						eq(caLegalCompany.version, input.expectedVersion),
					),
				)
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Corporate Administration legal company version is stale.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_STALE_VERSION",
						{ expectedVersion: input.expectedVersion },
					),
				);
			}
			return mapLegalCompanyRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async insertJurisdictionProfile(
		input: Parameters<LegalCompanyStore["insertJurisdictionProfile"]>[0],
	) {
		const jurisdictionProfileId = this.#createLegalCompanyId();
		if (input.transaction !== undefined) {
			const profile: CompanyJurisdictionProfile = {
				jurisdictionProfileId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				jurisdictionCountryCode: input.jurisdictionCountryCode,
				entityType: input.entityType,
				effectiveRange: input.effectiveRange,
				recordedAt: input.recordedAt,
				recordedByUserId: input.recordedByUserId,
				sourceReference: input.sourceReference,
				supersededAt: null,
				supersededByProfileId: null,
				version: 1,
			};
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					INSERT INTO ca_company_jurisdiction_profile (
						id,
						organization_id,
						legal_company_id,
						jurisdiction_country_code,
						entity_type,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_reference,
						version
					)
					VALUES (
						${jurisdictionProfileId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.jurisdictionCountryCode},
						${input.entityType},
						${input.effectiveRange.from},
						${input.effectiveRange.to},
						${input.recordedAt},
						${input.recordedAt},
						${input.recordedByUserId},
						${input.sourceReference},
						1
					)
				`;
			});
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					UPDATE ca_legal_company
					SET
						version = ${input.expectedCompanyVersion + 1},
						updated_by = ${input.recordedByUserId},
						updated_at = ${input.recordedAt}
					WHERE
						organization_id = ${input.organizationId}
						AND id = ${input.legalCompanyId}
						AND version = ${input.expectedCompanyVersion}
				`;
			});
			return ok(profile);
		}

		try {
			const rows = await this.#database
				.insert(caCompanyJurisdictionProfile)
				.values({
					id: jurisdictionProfileId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					jurisdictionCountryCode: input.jurisdictionCountryCode,
					entityType: input.entityType,
					effectiveFrom: input.effectiveRange.from,
					effectiveTo: input.effectiveRange.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceReference: input.sourceReference,
					version: 1,
				})
				.returning();
			await this.#database
				.update(caLegalCompany)
				.set({
					version: input.expectedCompanyVersion + 1,
					updatedBy: input.recordedByUserId,
					updatedAt: new Date(input.recordedAt),
				})
				.where(
					and(
						eq(caLegalCompany.organizationId, input.organizationId),
						eq(caLegalCompany.id, input.legalCompanyId),
						eq(caLegalCompany.version, input.expectedCompanyVersion),
					),
				);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration jurisdiction profile persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapJurisdictionProfileRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async supersedeJurisdictionProfile(
		input: Parameters<LegalCompanyStore["supersedeJurisdictionProfile"]>[0],
	) {
		const replacementId = this.#createLegalCompanyId();
		if (input.transaction !== undefined) {
			const replacement: CompanyJurisdictionProfile = {
				jurisdictionProfileId: replacementId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				jurisdictionCountryCode: input.replacement.jurisdictionCountryCode,
				entityType: input.replacement.entityType,
				effectiveRange: input.replacement.effectiveRange,
				recordedAt: input.replacement.recordedAt,
				recordedByUserId: input.recordedByUserId,
				sourceReference: input.replacement.sourceReference,
				supersededAt: null,
				supersededByProfileId: null,
				version: 1,
			};
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					INSERT INTO ca_company_jurisdiction_profile (
						id,
						organization_id,
						legal_company_id,
						jurisdiction_country_code,
						entity_type,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_reference,
						supersedes_id,
						version
					)
					VALUES (
						${replacementId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.replacement.jurisdictionCountryCode},
						${input.replacement.entityType},
						${input.replacement.effectiveRange.from},
						${input.replacement.effectiveRange.to},
						${input.replacement.recordedAt},
						${input.replacement.recordedAt},
						${input.recordedByUserId},
						${input.replacement.sourceReference},
						${input.jurisdictionProfileId},
						1
					)
				`;
			});
			input.transaction.enqueue((database) => {
				const sql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return sql`
					UPDATE ca_company_jurisdiction_profile
					SET
						superseded_at = ${input.replacement.recordedAt},
						recorded_to = ${input.replacement.recordedAt},
						superseded_by_profile_id = ${replacementId},
						version = ${input.expectedProfileVersion + 1},
						updated_at = ${input.replacement.recordedAt}
					WHERE
						organization_id = ${input.organizationId}
						AND id = ${input.jurisdictionProfileId}
						AND version = ${input.expectedProfileVersion}
				`;
			});
			return ok(replacement);
		}

		try {
			const replacementRows = await this.#database
				.insert(caCompanyJurisdictionProfile)
				.values({
					id: replacementId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					jurisdictionCountryCode: input.replacement.jurisdictionCountryCode,
					entityType: input.replacement.entityType,
					effectiveFrom: input.replacement.effectiveRange.from,
					effectiveTo: input.replacement.effectiveRange.to,
					recordedAt: new Date(input.replacement.recordedAt),
					recordedFrom: new Date(input.replacement.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceReference: input.replacement.sourceReference,
					supersedesId: input.jurisdictionProfileId,
					version: 1,
				})
				.returning();
			await this.#database
				.update(caCompanyJurisdictionProfile)
				.set({
					supersededAt: new Date(input.replacement.recordedAt),
					recordedTo: new Date(input.replacement.recordedAt),
					supersededByProfileId: replacementId,
					version: input.expectedProfileVersion + 1,
					updatedAt: new Date(input.replacement.recordedAt),
				})
				.where(
					and(
						eq(
							caCompanyJurisdictionProfile.organizationId,
							input.organizationId,
						),
						eq(caCompanyJurisdictionProfile.id, input.jurisdictionProfileId),
						eq(
							caCompanyJurisdictionProfile.version,
							input.expectedProfileVersion,
						),
					),
				);
			const row = replacementRows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration jurisdiction profile persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapJurisdictionProfileRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async insertCompanyName(
		input: NonNullable<LegalCompanyStore["insertCompanyName"]> extends (
			record: infer Record,
		) => Promise<Result<CompanyName>>
			? Record
			: never,
	): Promise<Result<CompanyName>> {
		return this.addCompanyName(input);
	}

	async addCompanyName(
		input: NonNullable<LegalCompanyStore["insertCompanyName"]> extends (
			record: infer Record,
		) => Promise<Result<CompanyName>>
			? Record
			: never,
	): Promise<Result<CompanyName>> {
		const companyNameId = companyNameIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const record: CompanyName = {
			id: companyNameId,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			nameType: input.nameType,
			languageCode: input.languageCode,
			displayName: input.displayName,
			normalizedName: input.normalizedName,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			supersedesId: null,
			supersededAt: null,
			retiredAt: null,
			version: 1,
		};

		if (input.transaction !== undefined) {
			enqueueLegalCompanyVersionBump(input.transaction, {
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				expectedCompanyVersion: input.expectedCompanyVersion,
				updatedAt: input.recordedAt,
			});
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					INSERT INTO ca_company_name (
						id,
						organization_id,
						legal_company_id,
						name_type,
						language_code,
						display_name,
						normalized_name,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_document_id,
						correction_reason,
						status,
						version
					)
					VALUES (
						${companyNameId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.nameType},
						${input.languageCode},
						${input.displayName},
						${input.normalizedName},
						${input.effectivePeriod.from},
						${input.effectivePeriod.to},
						${input.recordedAt},
						${input.recordedAt},
						${input.recordedByUserId},
						${input.sourceDocumentId},
						${input.correctionReason ?? null},
						'active',
						1
					)
				`;
			});
			return ok(record);
		}

		try {
			const rows = await this.#database
				.insert(caCompanyName)
				.values({
					id: companyNameId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					nameType: input.nameType,
					languageCode: input.languageCode,
					displayName: input.displayName,
					normalizedName: input.normalizedName,
					effectiveFrom: input.effectivePeriod.from,
					effectiveTo: input.effectivePeriod.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.sourceDocumentId,
					correctionReason: input.correctionReason ?? null,
					status: "active",
					version: 1,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration company-name persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyNameById(
		organizationId: Parameters<
			NonNullable<LegalCompanyStore["findCompanyNameById"]>
		>[0],
		companyNameId: Parameters<
			NonNullable<LegalCompanyStore["findCompanyNameById"]>
		>[1],
	): Promise<Result<CompanyName | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyName)
				.where(
					and(
						eq(caCompanyName.organizationId, organizationId),
						eq(caCompanyName.id, companyNameId),
					),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async getCompanyName(
		input: Parameters<CompanyNameStore["getCompanyName"]>[0],
	): Promise<Result<CompanyName | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyName)
				.where(
					and(
						eq(caCompanyName.organizationId, input.organizationId),
						eq(caCompanyName.legalCompanyId, input.legalCompanyId),
						eq(caCompanyName.id, input.companyNameId),
					),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listCompanyNames(
		query: Parameters<NonNullable<LegalCompanyStore["listCompanyNames"]>>[0],
	): Promise<Result<CompanyNameListPage>> {
		try {
			const conditions = [
				eq(caCompanyName.organizationId, query.organizationId),
				eq(caCompanyName.legalCompanyId, query.legalCompanyId),
			];
			if (query.nameType !== undefined) {
				conditions.push(eq(caCompanyName.nameType, query.nameType));
			}
			if (query.languageCode !== undefined) {
				conditions.push(eq(caCompanyName.languageCode, query.languageCode));
			}
			if (query.activeAt !== undefined) {
				conditions.push(
					sql`${caCompanyName.effectiveFrom} <= ${query.activeAt} AND ${query.activeAt} < COALESCE(${caCompanyName.effectiveTo}, '9999-12-31'::date)`,
				);
			}
			if (query.includeFormer !== true) {
				conditions.push(ne(caCompanyName.status, "retired"));
			}
			if (query.knownAt !== undefined) {
				conditions.push(
					sql`${caCompanyName.recordedFrom} <= ${query.knownAt} AND (${caCompanyName.recordedTo} IS NULL OR ${query.knownAt} < ${caCompanyName.recordedTo})`,
				);
			}
			const rows = await this.#database
				.select()
				.from(caCompanyName)
				.where(and(...conditions))
				.orderBy(
					asc(caCompanyName.nameType),
					asc(caCompanyName.languageCode),
					desc(caCompanyName.effectiveFrom),
					desc(caCompanyName.recordedAt),
					asc(caCompanyName.id),
				)
				.limit(query.pageSize ?? 50);
			const items: CompanyNameListItem[] = [];
			for (const row of rows) {
				const mapped = mapCompanyNameRow(row);
				if (!mapped.ok) return mapped;
				items.push({
					id: mapped.data.id,
					legalCompanyId: mapped.data.legalCompanyId,
					nameType: mapped.data.nameType,
					languageCode: mapped.data.languageCode,
					displayName: mapped.data.displayName,
					normalizedName: mapped.data.normalizedName,
					effectiveFrom: mapped.data.effectiveFrom,
					effectiveTo: mapped.data.effectiveTo,
					status: mapped.data.status,
				});
			}
			return ok({ items, nextCursor: null });
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyNameAsOf(
		query: Parameters<NonNullable<LegalCompanyStore["findCompanyNameAsOf"]>>[0],
	): Promise<Result<CompanyName | null>> {
		try {
			const conditions = [
				eq(caCompanyName.organizationId, query.organizationId),
				eq(caCompanyName.legalCompanyId, query.legalCompanyId),
				eq(caCompanyName.nameType, query.nameType),
				eq(caCompanyName.languageCode, query.languageCode),
				eq(caCompanyName.status, "active"),
				sql`${caCompanyName.effectiveFrom} <= ${query.asOf} AND ${query.asOf} < COALESCE(${caCompanyName.effectiveTo}, '9999-12-31'::date)`,
			];
			if (query.knownAt !== undefined) {
				conditions.push(
					sql`${caCompanyName.recordedFrom} <= ${query.knownAt} AND (${caCompanyName.recordedTo} IS NULL OR ${query.knownAt} < ${caCompanyName.recordedTo})`,
				);
			}
			const rows = await this.#database
				.select()
				.from(caCompanyName)
				.where(and(...conditions))
				.orderBy(desc(caCompanyName.recordedAt), asc(caCompanyName.id))
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findOverlappingCompanyName(
		query: CompanyNameOverlapQuery,
	): Promise<Result<CompanyName | null>> {
		try {
			const conditions = buildCompanyNameOverlapConditions(query);
			const rows = await this.#database
				.select()
				.from(caCompanyName)
				.where(and(...conditions))
				.orderBy(desc(caCompanyName.recordedAt), asc(caCompanyName.id))
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async hasOverlappingCompanyName(
		input: CompanyNameOverlapQuery,
	): Promise<Result<boolean>> {
		const overlap = await this.findOverlappingCompanyName(input);
		if (!overlap.ok) return overlap;
		return ok(overlap.data !== null);
	}

	async supersedeCompanyName(
		input: Parameters<
			NonNullable<LegalCompanyStore["supersedeCompanyName"]>
		>[0],
	): Promise<Result<CompanyName>> {
		const replacementId = companyNameIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const replacement: CompanyName = {
			id: replacementId,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			nameType: input.replacement.nameType,
			languageCode: input.replacement.languageCode,
			displayName: input.replacement.displayName,
			normalizedName: input.replacement.normalizedName,
			effectiveFrom: input.replacement.effectivePeriod.from,
			effectiveTo: input.replacement.effectivePeriod.to,
			recordedAt: new Date(input.replacement.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.replacement.sourceDocumentId,
			correctionReason: input.replacement.correctionReason,
			status: "active",
			supersedesId: input.companyNameId,
			supersededAt: null,
			retiredAt: null,
			version: 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					INSERT INTO ca_company_name (
						id,
						organization_id,
						legal_company_id,
						name_type,
						language_code,
						display_name,
						normalized_name,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_document_id,
						correction_reason,
						status,
						supersedes_id,
						version
					)
					VALUES (
						${replacementId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.replacement.nameType},
						${input.replacement.languageCode},
						${input.replacement.displayName},
						${input.replacement.normalizedName},
						${input.replacement.effectivePeriod.from},
						${input.replacement.effectivePeriod.to},
						${input.replacement.recordedAt},
						${input.replacement.recordedAt},
						${input.recordedByUserId},
						${input.replacement.sourceDocumentId},
						${input.replacement.correctionReason},
						'active',
						${input.companyNameId},
						1
					)
				`;
			});
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					UPDATE ca_company_name
					SET
						status = 'superseded',
						superseded_at = ${input.replacement.recordedAt},
						recorded_to = ${input.replacement.recordedAt},
						superseded_by_name_id = ${replacementId},
						version = ${input.expectedNameVersion + 1},
						updated_at = ${input.replacement.recordedAt}
					WHERE
						organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND id = ${input.companyNameId}
						AND version = ${input.expectedNameVersion}
				`;
			});
			return ok(replacement);
		}
		try {
			const rows = await this.#database
				.insert(caCompanyName)
				.values({
					id: replacementId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					nameType: input.replacement.nameType,
					languageCode: input.replacement.languageCode,
					displayName: input.replacement.displayName,
					normalizedName: input.replacement.normalizedName,
					effectiveFrom: input.replacement.effectivePeriod.from,
					effectiveTo: input.replacement.effectivePeriod.to,
					recordedAt: new Date(input.replacement.recordedAt),
					recordedFrom: new Date(input.replacement.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.replacement.sourceDocumentId,
					correctionReason: input.replacement.correctionReason,
					status: "active",
					supersedesId: input.companyNameId,
					version: 1,
				})
				.returning();
			await this.#database
				.update(caCompanyName)
				.set({
					status: "superseded",
					supersededAt: new Date(input.replacement.recordedAt),
					recordedTo: new Date(input.replacement.recordedAt),
					supersededByNameId: replacementId,
					version: input.expectedNameVersion + 1,
					updatedAt: new Date(input.replacement.recordedAt),
				})
				.where(
					and(
						eq(caCompanyName.organizationId, input.organizationId),
						eq(caCompanyName.legalCompanyId, input.legalCompanyId),
						eq(caCompanyName.id, input.companyNameId),
						eq(caCompanyName.version, input.expectedNameVersion),
					),
				);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration company-name persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async retireCompanyName(
		input: Parameters<NonNullable<LegalCompanyStore["retireCompanyName"]>>[0],
	): Promise<Result<CompanyName>> {
		try {
			const rows = await this.#database
				.update(caCompanyName)
				.set({
					status: "retired",
					retiredAt: new Date(input.retiredAt),
					retirementReason: input.retirementReason,
					version: input.expectedNameVersion + 1,
					updatedAt: new Date(input.retiredAt),
				})
				.where(
					and(
						eq(caCompanyName.organizationId, input.organizationId),
						eq(caCompanyName.legalCompanyId, input.legalCompanyId),
						eq(caCompanyName.id, input.companyNameId),
						eq(caCompanyName.version, input.expectedNameVersion),
					),
				)
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Corporate Administration company-name version is stale.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_STALE_VERSION",
						{ expectedVersion: input.expectedNameVersion },
					),
				);
			}
			return mapCompanyNameRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async insertCompanyLegalForm(
		input: Parameters<
			NonNullable<LegalCompanyStore["insertCompanyLegalForm"]>
		>[0],
	): Promise<Result<CompanyLegalFormHistory>> {
		return this.setCompanyLegalForm(input);
	}

	async setCompanyLegalForm(
		input: Parameters<
			NonNullable<LegalCompanyStore["insertCompanyLegalForm"]>
		>[0],
	): Promise<Result<CompanyLegalFormHistory>> {
		const legalFormId = companyLegalFormHistoryIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const record: CompanyLegalFormHistory = {
			id: legalFormId,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			jurisdictionCode: input.jurisdictionCode,
			legalFormCode: input.legalFormCode,
			entityTypeCode: input.entityTypeCode,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			supersedesId: null,
			supersededAt: null,
			version: 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					INSERT INTO ca_company_legal_form_history (
						id,
						organization_id,
						legal_company_id,
						jurisdiction_code,
						legal_form_code,
						entity_type_code,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_document_id,
						correction_reason,
						status,
						version
					)
					VALUES (
						${legalFormId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.jurisdictionCode},
						${input.legalFormCode},
						${input.entityTypeCode},
						${input.effectivePeriod.from},
						${input.effectivePeriod.to},
						${input.recordedAt},
						${input.recordedAt},
						${input.recordedByUserId},
						${input.sourceDocumentId},
						${input.correctionReason ?? null},
						'active',
						1
					)
				`;
			});
			return ok(record);
		}
		try {
			const rows = await this.#database
				.insert(caCompanyLegalFormHistory)
				.values({
					id: legalFormId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					jurisdictionCode: input.jurisdictionCode,
					legalFormCode: input.legalFormCode,
					entityTypeCode: input.entityTypeCode,
					effectiveFrom: input.effectivePeriod.from,
					effectiveTo: input.effectivePeriod.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.sourceDocumentId,
					correctionReason: input.correctionReason ?? null,
					status: "active",
					version: 1,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration legal-form persistence returned no row.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "database" },
					),
				);
			}
			return mapCompanyLegalFormRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async getCompanyLegalForm(
		input: Parameters<CompanyLegalFormStore["getCompanyLegalForm"]>[0],
	): Promise<Result<CompanyLegalFormHistory | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyLegalFormHistory)
				.where(
					and(
						eq(caCompanyLegalFormHistory.organizationId, input.organizationId),
						eq(caCompanyLegalFormHistory.legalCompanyId, input.legalCompanyId),
						eq(caCompanyLegalFormHistory.id, input.companyLegalFormHistoryId),
					),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyLegalFormRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listCompanyLegalForms(
		input: Parameters<CompanyLegalFormStore["listCompanyLegalForms"]>[0],
	): Promise<Result<readonly CompanyLegalFormHistory[]>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyLegalFormHistory)
				.where(
					and(
						eq(caCompanyLegalFormHistory.organizationId, input.organizationId),
						eq(caCompanyLegalFormHistory.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(
					desc(caCompanyLegalFormHistory.effectiveFrom),
					desc(caCompanyLegalFormHistory.recordedAt),
					asc(caCompanyLegalFormHistory.id),
				);
			const mapped = await Promise.all(rows.map(mapCompanyLegalFormRow));
			const failure = mapped.find((result) => !result.ok);
			if (failure !== undefined) return failure;
			return ok(mapped.flatMap((result) => (result.ok ? [result.data] : [])));
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyLegalFormAsOf(
		query: Parameters<
			NonNullable<LegalCompanyStore["findCompanyLegalFormAsOf"]>
		>[0],
	): Promise<Result<CompanyLegalFormHistory | null>> {
		try {
			const conditions = [
				eq(caCompanyLegalFormHistory.organizationId, query.organizationId),
				eq(caCompanyLegalFormHistory.legalCompanyId, query.legalCompanyId),
				eq(caCompanyLegalFormHistory.status, "active"),
				sql`${caCompanyLegalFormHistory.effectiveFrom} <= ${query.asOf} AND ${query.asOf} < COALESCE(${caCompanyLegalFormHistory.effectiveTo}, '9999-12-31'::date)`,
			];
			if (query.jurisdictionCode !== undefined) {
				conditions.push(
					eq(
						caCompanyLegalFormHistory.jurisdictionCode,
						query.jurisdictionCode,
					),
				);
			}
			if (query.knownAt !== undefined) {
				conditions.push(
					sql`${caCompanyLegalFormHistory.recordedFrom} <= ${query.knownAt} AND (${caCompanyLegalFormHistory.recordedTo} IS NULL OR ${query.knownAt} < ${caCompanyLegalFormHistory.recordedTo})`,
				);
			}
			const rows = await this.#database
				.select()
				.from(caCompanyLegalFormHistory)
				.where(and(...conditions))
				.orderBy(
					desc(caCompanyLegalFormHistory.recordedAt),
					asc(caCompanyLegalFormHistory.id),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyLegalFormRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findOverlappingCompanyLegalForm(
		query: CompanyLegalFormOverlapQuery,
	): Promise<Result<CompanyLegalFormHistory | null>> {
		try {
			const conditions = buildCompanyLegalFormOverlapConditions(query);
			const rows = await this.#database
				.select()
				.from(caCompanyLegalFormHistory)
				.where(and(...conditions))
				.orderBy(desc(caCompanyLegalFormHistory.recordedAt))
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyLegalFormRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async hasOverlappingCompanyLegalForm(
		input: CompanyLegalFormOverlapQuery,
	): Promise<Result<boolean>> {
		const overlap = await this.findOverlappingCompanyLegalForm(input);
		if (!overlap.ok) return overlap;
		return ok(overlap.data !== null);
	}

	async supersedeCompanyLegalForm(
		input: Parameters<
			NonNullable<LegalCompanyStore["supersedeCompanyLegalForm"]>
		>[0],
	): Promise<Result<CompanyLegalFormHistory>> {
		const replacementId = companyLegalFormHistoryIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					INSERT INTO ca_company_legal_form_history (
						id,
						organization_id,
						legal_company_id,
						jurisdiction_code,
						legal_form_code,
						entity_type_code,
						effective_from,
						effective_to,
						recorded_at,
						recorded_from,
						recorded_by,
						source_document_id,
						correction_reason,
						status,
						supersedes_id,
						version
					)
					VALUES (
						${replacementId},
						${input.organizationId},
						${input.legalCompanyId},
						${input.replacement.jurisdictionCode},
						${input.replacement.legalFormCode},
						${input.replacement.entityTypeCode},
						${input.replacement.effectivePeriod.from},
						${input.replacement.effectivePeriod.to},
						${input.replacement.recordedAt},
						${input.replacement.recordedAt},
						${input.recordedByUserId},
						${input.replacement.sourceDocumentId},
						${input.replacement.correctionReason},
						'active',
						${input.companyLegalFormHistoryId},
						1
					)
				`;
			});
			input.transaction.enqueue((database) => {
				const txSql = database as (
					strings: TemplateStringsArray,
					...values: unknown[]
				) => unknown;
				return txSql`
					UPDATE ca_company_legal_form_history
					SET
						status = 'superseded',
						superseded_at = ${input.replacement.recordedAt},
						recorded_to = ${input.replacement.recordedAt},
						superseded_by_legal_form_id = ${replacementId},
						version = ${input.expectedLegalFormVersion + 1},
						updated_at = ${input.replacement.recordedAt}
					WHERE
						organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND id = ${input.companyLegalFormHistoryId}
						AND version = ${input.expectedLegalFormVersion}
				`;
			});
		} else {
			try {
				await this.#database.insert(caCompanyLegalFormHistory).values({
					id: replacementId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					jurisdictionCode: input.replacement.jurisdictionCode,
					legalFormCode: input.replacement.legalFormCode,
					entityTypeCode: input.replacement.entityTypeCode,
					effectiveFrom: input.replacement.effectivePeriod.from,
					effectiveTo: input.replacement.effectivePeriod.to,
					recordedAt: new Date(input.replacement.recordedAt),
					recordedFrom: new Date(input.replacement.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.replacement.sourceDocumentId,
					correctionReason: input.replacement.correctionReason,
					status: "active",
					supersedesId: input.companyLegalFormHistoryId,
					version: 1,
				});
				await this.#database
					.update(caCompanyLegalFormHistory)
					.set({
						status: "superseded",
						supersededAt: new Date(input.replacement.recordedAt),
						recordedTo: new Date(input.replacement.recordedAt),
						supersededByLegalFormId: replacementId,
						version: input.expectedLegalFormVersion + 1,
						updatedAt: new Date(input.replacement.recordedAt),
					})
					.where(
						and(
							eq(
								caCompanyLegalFormHistory.organizationId,
								input.organizationId,
							),
							eq(
								caCompanyLegalFormHistory.legalCompanyId,
								input.legalCompanyId,
							),
							eq(caCompanyLegalFormHistory.id, input.companyLegalFormHistoryId),
							eq(
								caCompanyLegalFormHistory.version,
								input.expectedLegalFormVersion,
							),
						),
					);
			} catch (error) {
				const translated =
					translateCorporateAdministrationInfrastructureError(error);
				if (translated !== undefined) return translated;
				throw error;
			}
		}
		return ok({
			id: replacementId,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			jurisdictionCode: input.replacement.jurisdictionCode,
			legalFormCode: input.replacement.legalFormCode,
			entityTypeCode: input.replacement.entityTypeCode,
			effectiveFrom: input.replacement.effectivePeriod.from,
			effectiveTo: input.replacement.effectivePeriod.to,
			recordedAt: new Date(input.replacement.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.replacement.sourceDocumentId,
			correctionReason: input.replacement.correctionReason,
			status: "active",
			supersedesId: input.companyLegalFormHistoryId,
			supersededAt: null,
			version: 1,
		});
	}

	async lockCompanyNameScope(
		organizationId: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyNameScope"]>
		>[0],
		legalCompanyId: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyNameScope"]>
		>[1],
		nameType: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyNameScope"]>
		>[2],
		languageCode: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyNameScope"]>
		>[3],
	): Promise<Result<void>> {
		await this.#database.execute(
			sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${legalCompanyId}:${nameType}:${languageCode}`}, 0))`,
		);
		return ok(undefined);
	}

	async lockCompanyLegalFormScope(
		organizationId: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyLegalFormScope"]>
		>[0],
		legalCompanyId: Parameters<
			NonNullable<LegalCompanyStore["lockCompanyLegalFormScope"]>
		>[1],
	): Promise<Result<void>> {
		await this.#database.execute(
			sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${legalCompanyId}`}, 0))`,
		);
		return ok(undefined);
	}

	async registerCompanyIdentifier(
		input: Parameters<CompanyIdentifierStore["registerCompanyIdentifier"]>[0],
	): Promise<Result<CompanyIdentifier>> {
		const identifierId = companyIdentifierIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const record = makeCompanyIdentifierRecord(identifierId, input);
		if (input.transaction !== undefined) {
			enqueueIdentifierScopeLock(input.transaction, {
				organizationId: input.organizationId,
				identifierType: input.identifierType,
				jurisdictionCode: input.jurisdictionCode,
				issuingAuthorityCode: input.issuingAuthorityCode,
				normalizedIdentifierValue: input.normalizedIdentifierValue,
			});
			enqueueLegalCompanyVersionBump(input.transaction, {
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				expectedCompanyVersion: input.expectedCompanyVersion,
				updatedAt: input.recordedAt,
			});
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					INSERT INTO ca_company_identifier (
						id, organization_id, legal_company_id, identifier_type,
						jurisdiction_code, authority_code, display_value,
						normalized_value, effective_from, effective_to,
						recorded_at, recorded_from, recorded_by, source_document_id,
						correction_reason, status, version
					)
					VALUES (
						${identifierId}, ${input.organizationId}, ${input.legalCompanyId},
						${input.identifierType}, ${input.jurisdictionCode},
						${input.issuingAuthorityCode}, ${input.identifierValue},
						${input.normalizedIdentifierValue}, ${input.effectivePeriod.from},
						${input.effectivePeriod.to}, ${input.recordedAt},
						${input.recordedAt}, ${input.recordedByUserId},
						${input.sourceDocumentId}, ${input.correctionReason ?? null},
						'active', 1
					)
				`;
			});
			return ok(record);
		}
		try {
			await this.lockCompanyIdentifierScope(
				input.organizationId,
				input.legalCompanyId,
				input.identifierType,
				input.jurisdictionCode,
				input.issuingAuthorityCode,
				input.normalizedIdentifierValue,
			);
			const rows = await this.#database
				.insert(caCompanyIdentifier)
				.values({
					id: identifierId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					identifierType: input.identifierType,
					jurisdictionCode: input.jurisdictionCode,
					issuingAuthorityCode: input.issuingAuthorityCode,
					identifierValue: input.identifierValue,
					normalizedIdentifierValue: input.normalizedIdentifierValue,
					effectiveFrom: input.effectivePeriod.from,
					effectiveTo: input.effectivePeriod.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.sourceDocumentId,
					correctionReason: input.correctionReason ?? null,
					status: "active",
					version: 1,
				})
				.returning();
			const row = rows[0];
			return row === undefined
				? persistenceReturnedNoRow("company identifier")
				: mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async supersedeCompanyIdentifier(
		input: Parameters<CompanyIdentifierStore["supersedeCompanyIdentifier"]>[0],
	): Promise<Result<CompanyIdentifier>> {
		const replacementId = companyIdentifierIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const replacement = makeCompanyIdentifierReplacementRecord(
			replacementId,
			input,
		);
		if (input.transaction !== undefined) {
			enqueueIdentifierScopeLock(input.transaction, {
				organizationId: input.organizationId,
				identifierType: input.replacement.identifierType,
				jurisdictionCode: input.replacement.jurisdictionCode,
				issuingAuthorityCode: input.replacement.issuingAuthorityCode,
				normalizedIdentifierValue: input.replacement.normalizedIdentifierValue,
			});
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					UPDATE ca_company_identifier
					SET status = 'superseded',
						superseded_at = ${input.replacement.recordedAt},
						recorded_to = ${input.replacement.recordedAt},
						superseded_by_identifier_id = ${replacementId},
						version = ${input.expectedIdentifierVersion + 1},
						updated_at = ${input.replacement.recordedAt}
					WHERE organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND id = ${input.companyIdentifierId}
						AND version = ${input.expectedIdentifierVersion}
				`;
			});
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					INSERT INTO ca_company_identifier (
						id, organization_id, legal_company_id, identifier_type,
						jurisdiction_code, authority_code, display_value,
						normalized_value, effective_from, effective_to,
						recorded_at, recorded_from, recorded_by, source_document_id,
						correction_reason, status, supersedes_id, version
					)
					VALUES (
						${replacementId}, ${input.organizationId}, ${input.legalCompanyId},
						${input.replacement.identifierType},
						${input.replacement.jurisdictionCode},
						${input.replacement.issuingAuthorityCode},
						${input.replacement.identifierValue},
						${input.replacement.normalizedIdentifierValue},
						${input.replacement.effectivePeriod.from},
						${input.replacement.effectivePeriod.to},
						${input.replacement.recordedAt}, ${input.replacement.recordedAt},
						${input.recordedByUserId}, ${input.replacement.sourceDocumentId},
						${input.replacement.correctionReason}, 'active',
						${input.companyIdentifierId}, 1
					)
				`;
			});
			return ok(replacement);
		}
		try {
			await this.lockCompanyIdentifierScope(
				input.organizationId,
				input.legalCompanyId,
				input.replacement.identifierType,
				input.replacement.jurisdictionCode,
				input.replacement.issuingAuthorityCode,
				input.replacement.normalizedIdentifierValue,
			);
			const rows = await this.#database
				.insert(caCompanyIdentifier)
				.values({
					id: replacementId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					identifierType: input.replacement.identifierType,
					jurisdictionCode: input.replacement.jurisdictionCode,
					issuingAuthorityCode: input.replacement.issuingAuthorityCode,
					identifierValue: input.replacement.identifierValue,
					normalizedIdentifierValue:
						input.replacement.normalizedIdentifierValue,
					effectiveFrom: input.replacement.effectivePeriod.from,
					effectiveTo: input.replacement.effectivePeriod.to,
					recordedAt: new Date(input.replacement.recordedAt),
					recordedFrom: new Date(input.replacement.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.replacement.sourceDocumentId,
					correctionReason: input.replacement.correctionReason,
					status: "active",
					supersedesId: input.companyIdentifierId,
					version: 1,
				})
				.returning();
			await this.#database
				.update(caCompanyIdentifier)
				.set({
					status: "superseded",
					supersededAt: new Date(input.replacement.recordedAt),
					recordedTo: new Date(input.replacement.recordedAt),
					supersededByIdentifierId: replacementId,
					version: input.expectedIdentifierVersion + 1,
					updatedAt: new Date(input.replacement.recordedAt),
				})
				.where(
					and(
						eq(caCompanyIdentifier.organizationId, input.organizationId),
						eq(caCompanyIdentifier.legalCompanyId, input.legalCompanyId),
						eq(caCompanyIdentifier.id, input.companyIdentifierId),
						eq(caCompanyIdentifier.version, input.expectedIdentifierVersion),
					),
				);
			const row = rows[0];
			return row === undefined
				? persistenceReturnedNoRow("company identifier")
				: mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async retireCompanyIdentifier(
		input: Parameters<CompanyIdentifierStore["retireCompanyIdentifier"]>[0],
	): Promise<Result<CompanyIdentifier>> {
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					UPDATE ca_company_identifier
					SET status = 'retired',
						retired_at = ${input.retiredAt},
						retirement_reason = ${input.retirementReason},
						recorded_to = ${input.retiredAt},
						version = ${input.expectedIdentifierVersion + 1},
						updated_at = ${input.retiredAt}
					WHERE organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND id = ${input.companyIdentifierId}
						AND version = ${input.expectedIdentifierVersion}
				`;
			});
			const existing = await this.getCompanyIdentifier(input);
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("companyIdentifier");
			return ok({
				...existing.data,
				status: "retired",
				retiredAt: new Date(input.retiredAt),
				version: input.expectedIdentifierVersion + 1,
			});
		}
		try {
			const rows = await this.#database
				.update(caCompanyIdentifier)
				.set({
					status: "retired",
					retiredAt: new Date(input.retiredAt),
					retirementReason: input.retirementReason,
					recordedTo: new Date(input.retiredAt),
					version: input.expectedIdentifierVersion + 1,
					updatedAt: new Date(input.retiredAt),
				})
				.where(
					and(
						eq(caCompanyIdentifier.organizationId, input.organizationId),
						eq(caCompanyIdentifier.legalCompanyId, input.legalCompanyId),
						eq(caCompanyIdentifier.id, input.companyIdentifierId),
						eq(caCompanyIdentifier.version, input.expectedIdentifierVersion),
					),
				)
				.returning();
			const row = rows[0];
			return row === undefined
				? staleVersion(input.expectedIdentifierVersion)
				: mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async getCompanyIdentifier(
		input: Parameters<CompanyIdentifierStore["getCompanyIdentifier"]>[0],
	): Promise<Result<CompanyIdentifier | null>> {
		try {
			const conditions = [
				eq(caCompanyIdentifier.organizationId, input.organizationId),
				eq(caCompanyIdentifier.legalCompanyId, input.legalCompanyId),
				eq(caCompanyIdentifier.id, input.companyIdentifierId),
			];
			if (input.knownAt !== undefined) {
				conditions.push(knownAtCondition(caCompanyIdentifier, input.knownAt));
			}
			const rows = await this.#database
				.select()
				.from(caCompanyIdentifier)
				.where(and(...conditions))
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listCompanyIdentifiers(
		query: CompanyIdentifierListQuery,
	): Promise<Result<CompanyIdentifierListPage>> {
		try {
			const conditions = buildCompanyIdentifierListConditions(query);
			const rows = await this.#database
				.select()
				.from(caCompanyIdentifier)
				.where(and(...conditions))
				.orderBy(
					asc(caCompanyIdentifier.identifierType),
					asc(caCompanyIdentifier.jurisdictionCode),
					asc(caCompanyIdentifier.issuingAuthorityCode),
					desc(caCompanyIdentifier.effectiveFrom),
					desc(caCompanyIdentifier.recordedAt),
					asc(caCompanyIdentifier.id),
				)
				.limit(query.pageSize ?? 50);
			const items: CompanyIdentifierListItem[] = [];
			for (const row of rows) {
				const mapped = mapCompanyIdentifierRow(row);
				if (!mapped.ok) return mapped;
				items.push(toCompanyIdentifierListItem(mapped.data));
			}
			return ok({ items, nextCursor: null });
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyIdentifierAsOf(
		query: Parameters<CompanyIdentifierStore["findCompanyIdentifierAsOf"]>[0],
	): Promise<Result<CompanyIdentifier | null>> {
		try {
			const conditions = buildCompanyIdentifierAsOfConditions(query);
			const rows = await this.#database
				.select()
				.from(caCompanyIdentifier)
				.where(and(...conditions))
				.orderBy(
					desc(caCompanyIdentifier.recordedAt),
					asc(caCompanyIdentifier.id),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findOverlappingCompanyIdentifier(
		query: CompanyIdentifierOverlapQuery,
	): Promise<Result<CompanyIdentifier | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyIdentifier)
				.where(and(...buildCompanyIdentifierOverlapConditions(query)))
				.orderBy(
					desc(caCompanyIdentifier.recordedAt),
					asc(caCompanyIdentifier.id),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyIdentifierRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async lockCompanyIdentifierScope(
		organizationId: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[0],
		_legalCompanyId: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[1],
		identifierType: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[2],
		jurisdictionCode: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[3],
		issuingAuthorityCode: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[4],
		normalizedIdentifierValue: Parameters<
			CompanyIdentifierStore["lockCompanyIdentifierScope"]
		>[5],
	): Promise<Result<void>> {
		await this.#database.execute(
			sql`SELECT pg_advisory_xact_lock(hashtextextended(${identifierLockKey({ organizationId, identifierType, jurisdictionCode, issuingAuthorityCode, normalizedIdentifierValue })}, 0))`,
		);
		return ok(undefined);
	}

	async setCompanyFinancialYear(
		input: Parameters<CompanyFinancialYearStore["setCompanyFinancialYear"]>[0],
	): Promise<Result<CompanyFinancialYear>> {
		const financialYearId = companyFinancialYearIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const record = makeCompanyFinancialYearRecord(financialYearId, input);
		if (input.transaction !== undefined) {
			enqueueFinancialYearScopeLock(input.transaction, input);
			enqueueLegalCompanyVersionBump(input.transaction, {
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				expectedCompanyVersion: input.expectedCompanyVersion,
				updatedAt: input.recordedAt,
			});
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					INSERT INTO ca_company_financial_year (
						id, organization_id, legal_company_id, year_end_month,
						year_end_day, functional_currency_code, effective_from,
						effective_to, recorded_at, recorded_from, recorded_by,
						source_document_id, correction_reason, status, version
					)
					VALUES (
						${financialYearId}, ${input.organizationId}, ${input.legalCompanyId},
						${input.fiscalYearStartMonth}, ${input.fiscalYearStartDay},
						${input.reportingCurrencyCode}, ${input.effectivePeriod.from},
						${input.effectivePeriod.to}, ${input.recordedAt},
						${input.recordedAt}, ${input.recordedByUserId},
						${input.sourceDocumentId}, ${input.correctionReason ?? null},
						'active', 1
					)
				`;
			});
			return ok(record);
		}
		try {
			await this.lockCompanyFinancialYearScope(
				input.organizationId,
				input.legalCompanyId,
			);
			const rows = await this.#database
				.insert(caCompanyFinancialYear)
				.values({
					id: financialYearId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					fiscalYearStartMonth: input.fiscalYearStartMonth,
					fiscalYearStartDay: input.fiscalYearStartDay,
					reportingCurrencyCode: input.reportingCurrencyCode,
					effectiveFrom: input.effectivePeriod.from,
					effectiveTo: input.effectivePeriod.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.sourceDocumentId,
					correctionReason: input.correctionReason ?? null,
					status: "active",
					version: 1,
				})
				.returning();
			const row = rows[0];
			return row === undefined
				? persistenceReturnedNoRow("company financial year")
				: mapCompanyFinancialYearRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyFinancialYearAsOf(
		query: Parameters<
			CompanyFinancialYearStore["findCompanyFinancialYearAsOf"]
		>[0],
	): Promise<Result<CompanyFinancialYear | null>> {
		try {
			const conditions = [
				eq(caCompanyFinancialYear.organizationId, query.organizationId),
				eq(caCompanyFinancialYear.legalCompanyId, query.legalCompanyId),
				sql`${caCompanyFinancialYear.effectiveFrom} <= ${query.asOf} AND ${query.asOf} < COALESCE(${caCompanyFinancialYear.effectiveTo}, '9999-12-31'::date)`,
			];
			if (query.knownAt !== undefined) {
				conditions.push(
					knownAtCondition(caCompanyFinancialYear, query.knownAt),
				);
			}
			const rows = await this.#database
				.select()
				.from(caCompanyFinancialYear)
				.where(and(...conditions))
				.orderBy(
					desc(caCompanyFinancialYear.recordedAt),
					asc(caCompanyFinancialYear.id),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyFinancialYearRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findOverlappingCompanyFinancialYear(
		query: CompanyFinancialYearOverlapQuery,
	): Promise<Result<CompanyFinancialYear | null>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyFinancialYear)
				.where(and(...buildCompanyFinancialYearOverlapConditions(query)))
				.orderBy(
					desc(caCompanyFinancialYear.recordedAt),
					asc(caCompanyFinancialYear.id),
				)
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyFinancialYearRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async lockCompanyFinancialYearScope(
		organizationId: Parameters<
			CompanyFinancialYearStore["lockCompanyFinancialYearScope"]
		>[0],
		legalCompanyId: Parameters<
			CompanyFinancialYearStore["lockCompanyFinancialYearScope"]
		>[1],
	): Promise<Result<void>> {
		await this.#database.execute(
			sql`SELECT pg_advisory_xact_lock(hashtextextended(${financialYearLockKey({ organizationId, legalCompanyId })}, 0))`,
		);
		return ok(undefined);
	}

	async registerCompanyActivity(
		input: Parameters<CompanyActivityStore["registerCompanyActivity"]>[0],
	): Promise<Result<CompanyActivity>> {
		const activityId = companyActivityIdSchema.parse(
			this.#createLegalCompanyId(),
		);
		const record = makeCompanyActivityRecord(activityId, input);
		if (input.transaction !== undefined) {
			enqueueActivityScopeLock(input.transaction, input);
			enqueueLegalCompanyVersionBump(input.transaction, {
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				expectedCompanyVersion: input.expectedCompanyVersion,
				updatedAt: input.recordedAt,
			});
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					INSERT INTO ca_company_activity (
						id, organization_id, legal_company_id, activity_code,
						activity_type, jurisdiction_code, regulator_code, description,
						effective_from, effective_to, recorded_at, recorded_from,
						recorded_by, source_document_id, status, version
					)
					VALUES (
						${activityId}, ${input.organizationId}, ${input.legalCompanyId},
						${input.activityCode}, ${input.classification},
						${input.jurisdictionCode}, ${input.regulatorCode},
						${input.description}, ${input.effectivePeriod.from},
						${input.effectivePeriod.to}, ${input.recordedAt},
						${input.recordedAt}, ${input.recordedByUserId},
						${input.sourceDocumentId}, 'active', 1
					)
				`;
			});
			return ok(record);
		}
		try {
			await this.lockCompanyActivityScope(
				input.organizationId,
				input.legalCompanyId,
				input.classification,
				input.activityCode,
				input.jurisdictionCode,
			);
			const rows = await this.#database
				.insert(caCompanyActivity)
				.values({
					id: activityId,
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
					activityCode: input.activityCode,
					classification: input.classification,
					jurisdictionCode: input.jurisdictionCode,
					regulatorCode: input.regulatorCode,
					description: input.description,
					effectiveFrom: input.effectivePeriod.from,
					effectiveTo: input.effectivePeriod.to,
					recordedAt: new Date(input.recordedAt),
					recordedFrom: new Date(input.recordedAt),
					recordedBy: input.recordedByUserId,
					sourceDocumentId: input.sourceDocumentId,
					status: "active",
					version: 1,
				})
				.returning();
			const row = rows[0];
			return row === undefined
				? persistenceReturnedNoRow("company activity")
				: mapCompanyActivityRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async endCompanyActivity(
		input: Parameters<CompanyActivityStore["endCompanyActivity"]>[0],
	): Promise<Result<CompanyActivity>> {
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					UPDATE ca_company_activity
					SET status = 'ended',
						effective_to = ${input.endedAt},
						recorded_to = ${input.endedAt},
						version = ${input.expectedActivityVersion + 1},
						updated_at = now()
					WHERE organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND id = ${input.companyActivityId}
						AND version = ${input.expectedActivityVersion}
				`;
			});
			const existing = await this.getCompanyActivity(input);
			if (!existing.ok) return existing;
			if (existing.data === null) return notFound("companyActivity");
			return ok({
				...existing.data,
				status: "ended",
				effectiveTo: input.endedAt,
				version: input.expectedActivityVersion + 1,
			});
		}
		try {
			const rows = await this.#database
				.update(caCompanyActivity)
				.set({
					status: "ended",
					effectiveTo: input.endedAt,
					recordedTo: new Date(`${input.endedAt}T00:00:00.000Z`),
					version: input.expectedActivityVersion + 1,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(caCompanyActivity.organizationId, input.organizationId),
						eq(caCompanyActivity.legalCompanyId, input.legalCompanyId),
						eq(caCompanyActivity.id, input.companyActivityId),
						eq(caCompanyActivity.version, input.expectedActivityVersion),
					),
				)
				.returning();
			const row = rows[0];
			return row === undefined
				? staleVersion(input.expectedActivityVersion)
				: mapCompanyActivityRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async getCompanyActivity(
		input: Parameters<CompanyActivityStore["getCompanyActivity"]>[0],
	): Promise<Result<CompanyActivity | null>> {
		try {
			const conditions = [
				eq(caCompanyActivity.organizationId, input.organizationId),
				eq(caCompanyActivity.legalCompanyId, input.legalCompanyId),
				eq(caCompanyActivity.id, input.companyActivityId),
			];
			if (input.knownAt !== undefined) {
				conditions.push(knownAtCondition(caCompanyActivity, input.knownAt));
			}
			const rows = await this.#database
				.select()
				.from(caCompanyActivity)
				.where(and(...conditions))
				.limit(1);
			const row = rows[0];
			return row === undefined ? ok(null) : mapCompanyActivityRow(row);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listCompanyActivitiesAsOf(
		query: CompanyActivitiesAsOfQuery,
	): Promise<Result<readonly CompanyActivity[]>> {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyActivity)
				.where(and(...buildCompanyActivityAsOfConditions(query)))
				.orderBy(
					asc(caCompanyActivity.classification),
					asc(caCompanyActivity.activityCode),
					asc(caCompanyActivity.effectiveFrom),
					asc(caCompanyActivity.id),
				);
			const activities: CompanyActivity[] = [];
			for (const row of rows) {
				const mapped = mapCompanyActivityRow(row);
				if (!mapped.ok) return mapped;
				activities.push(mapped.data);
			}
			return ok(activities);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async lockCompanyActivityScope(
		organizationId: string,
		legalCompanyId: string,
		activityType: string,
		activityCode: string,
		jurisdictionCode: string,
	): Promise<Result<void>> {
		await this.#database.execute(
			sql`SELECT pg_advisory_xact_lock(hashtextextended(${activityLockKey({ organizationId, legalCompanyId, activityType, activityCode, jurisdictionCode })}, 0))`,
		);
		return ok(undefined);
	}

	async findJurisdictionProfileAsOf(
		input: Parameters<LegalCompanyStore["findJurisdictionProfileAsOf"]>[0],
	) {
		const profiles = await this.listJurisdictionProfiles(input);
		if (!profiles.ok) return profiles;
		const profile =
			profiles.data
				.filter(
					(candidate) =>
						matchesAsOf({ profile: candidate, asOf: input.asOf }) &&
						isVisibleAtKnownTime({
							profile: candidate,
							knownAt: input.knownAt,
						}),
				)
				.sort((left, right) =>
					right.recordedAt.localeCompare(left.recordedAt),
				)[0] ?? null;
		return ok(profile);
	}

	async listJurisdictionProfiles(
		input: Parameters<LegalCompanyStore["listJurisdictionProfiles"]>[0],
	) {
		try {
			const rows = await this.#database
				.select()
				.from(caCompanyJurisdictionProfile)
				.where(
					and(
						eq(
							caCompanyJurisdictionProfile.organizationId,
							input.organizationId,
						),
						eq(
							caCompanyJurisdictionProfile.legalCompanyId,
							input.legalCompanyId,
						),
					),
				)
				.orderBy(asc(caCompanyJurisdictionProfile.recordedAt));
			const profiles: CompanyJurisdictionProfile[] = [];
			for (const row of rows) {
				const mapped = mapJurisdictionProfileRow(row);
				if (!mapped.ok) return mapped;
				profiles.push(mapped.data);
			}
			return ok(profiles);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async hasOverlappingJurisdictionProfile(
		input: Parameters<
			LegalCompanyStore["hasOverlappingJurisdictionProfile"]
		>[0],
	) {
		const profiles = await this.listJurisdictionProfiles(input);
		if (!profiles.ok) return profiles;
		const candidateTo = input.effectiveRange.to ?? "9999-12-31";
		return ok(
			profiles.data.some((profile) => {
				const profileTo = profile.effectiveRange.to ?? "9999-12-31";
				return (
					profile.supersededAt === null &&
					profile.jurisdictionProfileId !== input.ignoreJurisdictionProfileId &&
					profile.effectiveRange.from < candidateTo &&
					input.effectiveRange.from < profileTo
				);
			}),
		);
	}

	async lockLegalCompany(
		input: Parameters<LegalCompanyStore["lockLegalCompany"]>[0],
	) {
		return this.getLegalCompany(input);
	}

	async changeLegalCompanyStatus(
		input: Parameters<LegalCompanyStore["changeLegalCompanyStatus"]>[0],
	): Promise<Result<CompanyStatusHistory>> {
		const statusId = this.#createLegalCompanyId();
		const record: CompanyStatusHistory = {
			id: statusId,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			status: input.status,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			reason: input.reason,
			sourceDocumentId: input.sourceDocumentId,
			version: input.expectedCompanyVersion + 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const txSql = asTransactionSql(database);
				return txSql`
					WITH updated_company AS (
						UPDATE ca_legal_company
						SET state = ${input.status},
							updated_at = ${new Date(input.recordedAt)},
							updated_by = ${input.recordedByUserId},
							version = version + 1
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.legalCompanyId}
							AND version = ${input.expectedCompanyVersion}
						RETURNING id
					),
					assert_updated AS (
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM updated_company) THEN 1
							ELSE 1 / 0
						END AS checked
					),
					closed_status AS (
						UPDATE ca_company_status_history
						SET effective_to = ${input.effectiveFrom}
						WHERE organization_id = ${input.organizationId}
							AND legal_company_id = ${input.legalCompanyId}
							AND effective_to IS NULL
							AND EXISTS (SELECT 1 FROM updated_company)
						RETURNING id
					)
					INSERT INTO ca_company_status_history (
						id, organization_id, legal_company_id, status, effective_from,
						effective_to, recorded_at, recorded_by, reason, source_document_id,
						version
					)
					SELECT
						${record.id}, ${record.organizationId}, ${record.legalCompanyId},
						${record.status}, ${record.effectiveFrom}, ${record.effectiveTo},
						${record.recordedAt}, ${record.recordedBy}, ${record.reason},
						${record.sourceDocumentId}, ${record.version}
					FROM assert_updated, (SELECT count(*) FROM closed_status) closed
				`;
			});
			return ok(record);
		}

		try {
			await this.#database.execute(sql`
				WITH updated_company AS (
					UPDATE ca_legal_company
					SET state = ${input.status},
						updated_at = ${new Date(input.recordedAt)},
						updated_by = ${input.recordedByUserId},
						version = version + 1
					WHERE organization_id = ${input.organizationId}
						AND id = ${input.legalCompanyId}
						AND version = ${input.expectedCompanyVersion}
					RETURNING id
				),
				assert_updated AS (
					SELECT CASE
						WHEN EXISTS (SELECT 1 FROM updated_company) THEN 1
						ELSE 1 / 0
					END AS checked
				),
				closed_status AS (
					UPDATE ca_company_status_history
					SET effective_to = ${input.effectiveFrom}
					WHERE organization_id = ${input.organizationId}
						AND legal_company_id = ${input.legalCompanyId}
						AND effective_to IS NULL
						AND EXISTS (SELECT 1 FROM updated_company)
					RETURNING id
				)
				INSERT INTO ca_company_status_history (
					id, organization_id, legal_company_id, status, effective_from,
					effective_to, recorded_at, recorded_by, reason, source_document_id,
					version
				)
				SELECT
					${record.id}, ${record.organizationId}, ${record.legalCompanyId},
					${record.status}, ${record.effectiveFrom}, ${record.effectiveTo},
					${record.recordedAt}, ${record.recordedBy}, ${record.reason},
					${record.sourceDocumentId}, ${record.version}
				FROM assert_updated, (SELECT count(*) FROM closed_status) closed
			`);
			return ok(record);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async findCompanyStatusAsOf(
		query: Parameters<LegalCompanyStore["findCompanyStatusAsOf"]>[0],
	): Promise<Result<CompanyStatusHistory | null>> {
		try {
			const conditions = [
				eq(caCompanyStatusHistory.organizationId, query.organizationId),
				eq(caCompanyStatusHistory.legalCompanyId, query.legalCompanyId),
				sql`${caCompanyStatusHistory.effectiveFrom} <= ${query.asOf}`,
				sql`(${caCompanyStatusHistory.effectiveTo} IS NULL OR ${query.asOf} < ${caCompanyStatusHistory.effectiveTo})`,
			];
			if (query.knownAt !== undefined) {
				conditions.push(
					sql`${caCompanyStatusHistory.recordedAt} <= ${new Date(query.knownAt)}`,
				);
			}
			const row = await this.#database
				.select()
				.from(caCompanyStatusHistory)
				.where(and(...conditions))
				.orderBy(desc(caCompanyStatusHistory.recordedAt))
				.limit(1)
				.then((rows) => rows[0]);
			return ok(row === undefined ? null : mapCompanyStatusHistoryRow(row));
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async listCompaniesByStatus(
		query: CompaniesByStatusQuery,
	): Promise<Result<LegalCompanyListPage>> {
		try {
			const rows = await this.#database
				.select()
				.from(caLegalCompany)
				.where(
					and(
						eq(caLegalCompany.organizationId, query.organizationId),
						query.asOf === undefined
							? eq(caLegalCompany.state, query.status)
							: sql`true`,
					),
				)
				.orderBy(asc(caLegalCompany.normalizedCompanyCode))
				.limit(query.asOf === undefined ? query.pagination.limit : 500);
			const items: LegalCompanyListItem[] = [];
			for (const row of rows) {
				const company = mapLegalCompanyRow(row);
				if (!company.ok) return company;
				if (query.asOf !== undefined) {
					const status = await this.findCompanyStatusAsOf({
						organizationId: query.organizationId,
						legalCompanyId: company.data.legalCompanyId,
						asOf: query.asOf,
						knownAt: query.knownAt,
					});
					if (!status.ok) return status;
					if (status.data?.status !== query.status) continue;
				}
				items.push({
					organizationId: company.data.organizationId,
					legalCompanyId: company.data.legalCompanyId,
					companyCode: company.data.companyCode,
					normalizedCompanyCode: company.data.normalizedCompanyCode,
					masterDataPartyId: company.data.masterDataPartyId,
					homeJurisdictionCountryCode: company.data.homeJurisdictionCountryCode,
					state: company.data.state,
					profile: company.data.profile,
					version: company.data.version,
					jurisdictionCountryCode: company.data.homeJurisdictionCountryCode,
					entityType: "draft_legal_company",
				});
				if (items.length >= query.pagination.limit) break;
			}
			return ok({ items, nextCursor: null });
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async getLegalCompanyTimeline(
		input: Parameters<LegalCompanyStore["getLegalCompanyTimeline"]>[0],
	) {
		const company = await this.getLegalCompany(input);
		if (!company.ok) return company;
		const entries: LegalCompanyTimelineEntry[] = [];
		if (company.data !== null) {
			entries.push({
				kind: "profile",
				legalCompanyId: company.data.legalCompanyId,
				recordedAt: company.data.updatedAt,
				version: company.data.version,
				profile: company.data.profile,
			});
		}
		const profiles = await this.listJurisdictionProfiles(input);
		if (!profiles.ok) return profiles;
		for (const profile of profiles.data) {
			if (isVisibleAtKnownTime({ profile, knownAt: input.knownAt })) {
				entries.push({ ...profile, kind: "jurisdiction_profile" });
			}
		}
		const statuses = await this.#database
			.select()
			.from(caCompanyStatusHistory)
			.where(
				and(
					eq(caCompanyStatusHistory.organizationId, input.organizationId),
					eq(caCompanyStatusHistory.legalCompanyId, input.legalCompanyId),
				),
			)
			.orderBy(asc(caCompanyStatusHistory.recordedAt));
		for (const status of statuses) {
			if (
				input.knownAt === undefined ||
				status.recordedAt <= new Date(input.knownAt)
			) {
				entries.push({
					...mapCompanyStatusHistoryRow(status),
					kind: "company_status",
				});
			}
		}
		return ok(
			entries.sort(
				(left, right) =>
					new Date(left.recordedAt).getTime() -
					new Date(right.recordedAt).getTime(),
			),
		);
	}
}

function mapLegalCompanyRow(
	row: typeof caLegalCompany.$inferSelect,
): Result<LegalCompany> {
	return ok({
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.id),
		companyCode: row.companyCode,
		normalizedCompanyCode: row.normalizedCompanyCode,
		masterDataPartyId: row.masterDataPartyId,
		homeJurisdictionCountryCode: row.homeJurisdictionCountryCode,
		state: legalCompanyStatusSchema.parse(row.state),
		profile: {
			displayName: row.displayName,
			sourceReference: "ca_legal_company",
		},
		currentJurisdictionProfile: null,
		createdByUserId: userIdSchema.parse(row.createdBy),
		updatedByUserId: userIdSchema.parse(row.updatedBy),
		createdAt: toCanonicalInstant(row.createdAt),
		updatedAt: toCanonicalInstant(row.updatedAt),
		version: row.version,
	});
}

function mapCompanyStatusHistoryRow(
	row: typeof caCompanyStatusHistory.$inferSelect,
): CompanyStatusHistory {
	return {
		id: row.id,
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		status: legalCompanyStatusSchema.parse(row.status),
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		reason: row.reason,
		sourceDocumentId: row.sourceDocumentId,
		version: row.version,
	};
}

function mapJurisdictionProfileRow(
	row: typeof caCompanyJurisdictionProfile.$inferSelect,
): Result<CompanyJurisdictionProfile> {
	return ok({
		jurisdictionProfileId: row.id,
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		jurisdictionCountryCode: row.jurisdictionCountryCode,
		entityType: row.entityType,
		effectiveRange: {
			from: canonicalDateSchema.parse(row.effectiveFrom),
			to:
				row.effectiveTo === null
					? null
					: canonicalDateSchema.parse(row.effectiveTo),
		},
		recordedAt: toCanonicalInstant(row.recordedAt),
		recordedByUserId: userIdSchema.parse(row.recordedBy),
		sourceReference: row.sourceReference,
		supersededAt:
			row.supersededAt === null ? null : toCanonicalInstant(row.supersededAt),
		supersededByProfileId: row.supersededByProfileId,
		version: row.version,
	});
}

function mapCompanyNameRow(
	row: typeof caCompanyName.$inferSelect,
): Result<CompanyName> {
	return ok({
		id: companyNameIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		nameType:
			row.nameType === "legal" ||
			row.nameType === "former" ||
			row.nameType === "translated" ||
			row.nameType === "trading"
				? row.nameType
				: "legal",
		languageCode: row.languageCode,
		displayName: row.displayName,
		normalizedName: row.normalizedName,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		correctionReason: row.correctionReason,
		status:
			row.status === "active" ||
			row.status === "superseded" ||
			row.status === "retired"
				? row.status
				: "active",
		supersedesId:
			row.supersedesId === null
				? null
				: companyNameIdSchema.parse(row.supersedesId),
		supersededAt: row.supersededAt,
		retiredAt: row.retiredAt,
		version: row.version,
	});
}

function mapCompanyLegalFormRow(
	row: typeof caCompanyLegalFormHistory.$inferSelect,
): Result<CompanyLegalFormHistory> {
	return ok({
		id: companyLegalFormHistoryIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		jurisdictionCode: row.jurisdictionCode,
		legalFormCode: row.legalFormCode,
		entityTypeCode: row.entityTypeCode,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		correctionReason: row.correctionReason,
		status: row.status === "superseded" ? "superseded" : "active",
		supersedesId:
			row.supersedesId === null
				? null
				: companyLegalFormHistoryIdSchema.parse(row.supersedesId),
		supersededAt: row.supersededAt,
		version: row.version,
	});
}

function mapCompanyIdentifierRow(
	row: typeof caCompanyIdentifier.$inferSelect,
): Result<CompanyIdentifier> {
	return ok({
		id: companyIdentifierIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		identifierType:
			row.identifierType === "company_registration" ||
			row.identifierType === "registry_number" ||
			row.identifierType === "business_registration" ||
			row.identifierType === "foreign_registration" ||
			row.identifierType === "legal_entity_identifier" ||
			row.identifierType === "statistical_identifier" ||
			row.identifierType === "industry_identifier" ||
			row.identifierType === "other_non_tax_identifier"
				? row.identifierType
				: "other_non_tax_identifier",
		jurisdictionCode: row.jurisdictionCode,
		issuingAuthorityCode: row.issuingAuthorityCode,
		identifierValue: row.identifierValue,
		normalizedIdentifierValue: row.normalizedIdentifierValue,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		correctionReason: row.correctionReason,
		status:
			row.status === "superseded" || row.status === "retired"
				? row.status
				: "active",
		supersedesId:
			row.supersedesId === null
				? null
				: companyIdentifierIdSchema.parse(row.supersedesId),
		supersededAt: row.supersededAt,
		retiredAt: row.retiredAt,
		version: row.version,
	});
}

function mapCompanyFinancialYearRow(
	row: typeof caCompanyFinancialYear.$inferSelect,
): Result<CompanyFinancialYear> {
	return ok({
		id: companyFinancialYearIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		fiscalYearStartMonth: row.fiscalYearStartMonth,
		fiscalYearStartDay: row.fiscalYearStartDay,
		reportingCurrencyCode: row.reportingCurrencyCode,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		correctionReason: row.correctionReason,
		status: "active",
		version: row.version,
	});
}

function mapCompanyActivityRow(
	row: typeof caCompanyActivity.$inferSelect,
): Result<CompanyActivity> {
	return ok({
		id: companyActivityIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		activityCode: row.activityCode,
		classification:
			row.classification === "registered_object" ||
			row.classification === "regulated" ||
			row.classification === "operational"
				? row.classification
				: "operational",
		jurisdictionCode: row.jurisdictionCode,
		regulatorCode: row.regulatorCode,
		description: row.description,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		status: row.status === "ended" ? "ended" : "active",
		version: row.version,
	});
}

function toCompanyIdentifierListItem(
	identifier: CompanyIdentifier,
): CompanyIdentifierListItem {
	return {
		id: identifier.id,
		legalCompanyId: identifier.legalCompanyId,
		identifierType: identifier.identifierType,
		jurisdictionCode: identifier.jurisdictionCode,
		issuingAuthorityCode: identifier.issuingAuthorityCode,
		identifierValue: identifier.identifierValue,
		normalizedIdentifierValue: identifier.normalizedIdentifierValue,
		effectiveFrom: identifier.effectiveFrom,
		effectiveTo: identifier.effectiveTo,
		recordedAt: identifier.recordedAt,
		status: identifier.status,
	};
}

function makeCompanyIdentifierRecord(
	id: CompanyIdentifier["id"],
	input: Parameters<CompanyIdentifierStore["registerCompanyIdentifier"]>[0],
): CompanyIdentifier {
	return {
		id,
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		identifierType: input.identifierType,
		jurisdictionCode: input.jurisdictionCode,
		issuingAuthorityCode: input.issuingAuthorityCode,
		identifierValue: input.identifierValue,
		normalizedIdentifierValue: input.normalizedIdentifierValue,
		effectiveFrom: input.effectivePeriod.from,
		effectiveTo: input.effectivePeriod.to,
		recordedAt: new Date(input.recordedAt),
		recordedBy: input.recordedByUserId,
		sourceDocumentId: input.sourceDocumentId,
		correctionReason: input.correctionReason ?? null,
		status: "active",
		supersedesId: null,
		supersededAt: null,
		retiredAt: null,
		version: 1,
	};
}

function makeCompanyIdentifierReplacementRecord(
	id: CompanyIdentifier["id"],
	input: Parameters<CompanyIdentifierStore["supersedeCompanyIdentifier"]>[0],
): CompanyIdentifier {
	return {
		id,
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		identifierType: input.replacement.identifierType,
		jurisdictionCode: input.replacement.jurisdictionCode,
		issuingAuthorityCode: input.replacement.issuingAuthorityCode,
		identifierValue: input.replacement.identifierValue,
		normalizedIdentifierValue: input.replacement.normalizedIdentifierValue,
		effectiveFrom: input.replacement.effectivePeriod.from,
		effectiveTo: input.replacement.effectivePeriod.to,
		recordedAt: new Date(input.replacement.recordedAt),
		recordedBy: input.recordedByUserId,
		sourceDocumentId: input.replacement.sourceDocumentId,
		correctionReason: input.replacement.correctionReason,
		status: "active",
		supersedesId: input.companyIdentifierId,
		supersededAt: null,
		retiredAt: null,
		version: 1,
	};
}

function makeCompanyFinancialYearRecord(
	id: CompanyFinancialYear["id"],
	input: Parameters<CompanyFinancialYearStore["setCompanyFinancialYear"]>[0],
): CompanyFinancialYear {
	return {
		id,
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		fiscalYearStartMonth: input.fiscalYearStartMonth,
		fiscalYearStartDay: input.fiscalYearStartDay,
		reportingCurrencyCode: input.reportingCurrencyCode,
		effectiveFrom: input.effectivePeriod.from,
		effectiveTo: input.effectivePeriod.to,
		recordedAt: new Date(input.recordedAt),
		recordedBy: input.recordedByUserId,
		sourceDocumentId: input.sourceDocumentId,
		correctionReason: input.correctionReason ?? null,
		status: "active",
		version: 1,
	};
}

function makeCompanyActivityRecord(
	id: CompanyActivity["id"],
	input: Parameters<CompanyActivityStore["registerCompanyActivity"]>[0],
): CompanyActivity {
	return {
		id,
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		activityCode: input.activityCode,
		classification: input.classification,
		jurisdictionCode: input.jurisdictionCode,
		regulatorCode: input.regulatorCode,
		description: input.description,
		effectiveFrom: input.effectivePeriod.from,
		effectiveTo: input.effectivePeriod.to,
		recordedAt: new Date(input.recordedAt),
		recordedBy: input.recordedByUserId,
		sourceDocumentId: input.sourceDocumentId,
		status: "active",
		version: 1,
	};
}

function buildCompanyNameOverlapConditions(query: CompanyNameOverlapQuery) {
	const candidateTo = query.effectivePeriod.to ?? "9999-12-31";
	const conditions = [
		eq(caCompanyName.organizationId, query.organizationId),
		eq(caCompanyName.legalCompanyId, query.legalCompanyId),
		eq(caCompanyName.nameType, query.nameType),
		eq(caCompanyName.languageCode, query.languageCode),
		sql`${caCompanyName.effectiveFrom} < ${candidateTo} AND ${query.effectivePeriod.from} < COALESCE(${caCompanyName.effectiveTo}, '9999-12-31'::date)`,
	];
	if (query.normalizedName !== undefined) {
		conditions.push(eq(caCompanyName.normalizedName, query.normalizedName));
	}
	if (query.ignoreCompanyNameId !== undefined) {
		conditions.push(ne(caCompanyName.id, query.ignoreCompanyNameId));
	}
	if (query.statuses !== undefined && query.statuses.length > 0) {
		conditions.push(inArray(caCompanyName.status, [...query.statuses]));
	}
	return conditions;
}

function buildCompanyLegalFormOverlapConditions(
	query: CompanyLegalFormOverlapQuery,
) {
	const candidateTo = query.effectivePeriod.to ?? "9999-12-31";
	const conditions = [
		eq(caCompanyLegalFormHistory.organizationId, query.organizationId),
		eq(caCompanyLegalFormHistory.legalCompanyId, query.legalCompanyId),
		sql`${caCompanyLegalFormHistory.effectiveFrom} < ${candidateTo} AND ${query.effectivePeriod.from} < COALESCE(${caCompanyLegalFormHistory.effectiveTo}, '9999-12-31'::date)`,
	];
	if (query.ignoreCompanyLegalFormId !== undefined) {
		conditions.push(
			ne(caCompanyLegalFormHistory.id, query.ignoreCompanyLegalFormId),
		);
	}
	if (query.statuses !== undefined && query.statuses.length > 0) {
		conditions.push(
			inArray(caCompanyLegalFormHistory.status, [...query.statuses]),
		);
	}
	return conditions;
}

function buildCompanyIdentifierListConditions(
	query: CompanyIdentifierListQuery,
) {
	const conditions = [
		eq(caCompanyIdentifier.organizationId, query.organizationId),
		eq(caCompanyIdentifier.legalCompanyId, query.legalCompanyId),
	];
	if (query.identifierType !== undefined) {
		conditions.push(
			eq(caCompanyIdentifier.identifierType, query.identifierType),
		);
	}
	if (query.jurisdictionCode !== undefined) {
		conditions.push(
			eq(caCompanyIdentifier.jurisdictionCode, query.jurisdictionCode),
		);
	}
	if (query.issuingAuthorityCode !== undefined) {
		conditions.push(
			eq(caCompanyIdentifier.issuingAuthorityCode, query.issuingAuthorityCode),
		);
	}
	if (query.activeAt !== undefined) {
		conditions.push(identifierAsOfCondition(query.activeAt));
	}
	if (query.includeRetired !== true) {
		conditions.push(ne(caCompanyIdentifier.status, "retired"));
	}
	if (query.knownAt !== undefined) {
		conditions.push(knownAtCondition(caCompanyIdentifier, query.knownAt));
	}
	return conditions;
}

function buildCompanyIdentifierAsOfConditions(
	query: Parameters<CompanyIdentifierStore["findCompanyIdentifierAsOf"]>[0],
) {
	const conditions = [
		eq(caCompanyIdentifier.organizationId, query.organizationId),
		eq(caCompanyIdentifier.legalCompanyId, query.legalCompanyId),
		eq(caCompanyIdentifier.identifierType, query.identifierType),
		eq(caCompanyIdentifier.status, "active"),
		identifierAsOfCondition(query.asOf),
	];
	if (query.jurisdictionCode !== undefined) {
		conditions.push(
			eq(caCompanyIdentifier.jurisdictionCode, query.jurisdictionCode),
		);
	}
	if (query.issuingAuthorityCode !== undefined) {
		conditions.push(
			eq(caCompanyIdentifier.issuingAuthorityCode, query.issuingAuthorityCode),
		);
	}
	if (query.knownAt !== undefined) {
		conditions.push(knownAtCondition(caCompanyIdentifier, query.knownAt));
	}
	return conditions;
}

function buildCompanyIdentifierOverlapConditions(
	query: CompanyIdentifierOverlapQuery,
) {
	const candidateTo = query.effectivePeriod.to ?? "9999-12-31";
	const conditions = [
		eq(caCompanyIdentifier.organizationId, query.organizationId),
		eq(caCompanyIdentifier.legalCompanyId, query.legalCompanyId),
		eq(caCompanyIdentifier.identifierType, query.identifierType),
		eq(caCompanyIdentifier.jurisdictionCode, query.jurisdictionCode),
		eq(caCompanyIdentifier.issuingAuthorityCode, query.issuingAuthorityCode),
		eq(
			caCompanyIdentifier.normalizedIdentifierValue,
			query.normalizedIdentifierValue,
		),
		sql`${caCompanyIdentifier.effectiveFrom} < ${candidateTo} AND ${query.effectivePeriod.from} < COALESCE(${caCompanyIdentifier.effectiveTo}, '9999-12-31'::date)`,
	];
	if (query.ignoreCompanyIdentifierId !== undefined) {
		conditions.push(
			ne(caCompanyIdentifier.id, query.ignoreCompanyIdentifierId),
		);
	}
	if (query.statuses !== undefined && query.statuses.length > 0) {
		conditions.push(inArray(caCompanyIdentifier.status, [...query.statuses]));
	}
	return conditions;
}

function buildCompanyFinancialYearOverlapConditions(
	query: CompanyFinancialYearOverlapQuery,
) {
	const candidateTo = query.effectivePeriod.to ?? "9999-12-31";
	const conditions = [
		eq(caCompanyFinancialYear.organizationId, query.organizationId),
		eq(caCompanyFinancialYear.legalCompanyId, query.legalCompanyId),
		sql`${caCompanyFinancialYear.effectiveFrom} < ${candidateTo} AND ${query.effectivePeriod.from} < COALESCE(${caCompanyFinancialYear.effectiveTo}, '9999-12-31'::date)`,
	];
	if (query.ignoreCompanyFinancialYearId !== undefined) {
		conditions.push(
			ne(caCompanyFinancialYear.id, query.ignoreCompanyFinancialYearId),
		);
	}
	return conditions;
}

function buildCompanyActivityAsOfConditions(query: CompanyActivitiesAsOfQuery) {
	const conditions = [
		eq(caCompanyActivity.organizationId, query.organizationId),
		eq(caCompanyActivity.legalCompanyId, query.legalCompanyId),
		sql`${caCompanyActivity.effectiveFrom} <= ${query.asOf} AND ${query.asOf} < COALESCE(${caCompanyActivity.effectiveTo}, '9999-12-31'::date)`,
	];
	if (query.classification !== undefined) {
		conditions.push(eq(caCompanyActivity.classification, query.classification));
	}
	if (query.jurisdictionCode !== undefined) {
		conditions.push(
			eq(caCompanyActivity.jurisdictionCode, query.jurisdictionCode),
		);
	}
	if (query.regulatorCode !== undefined) {
		conditions.push(eq(caCompanyActivity.regulatorCode, query.regulatorCode));
	}
	if (query.knownAt !== undefined) {
		conditions.push(knownAtCondition(caCompanyActivity, query.knownAt));
	}
	return conditions;
}

function identifierAsOfCondition(asOf: string) {
	return sql`${caCompanyIdentifier.effectiveFrom} <= ${asOf} AND ${asOf} < COALESCE(${caCompanyIdentifier.effectiveTo}, '9999-12-31'::date)`;
}

function knownAtCondition(
	table: Readonly<{ recordedFrom: unknown; recordedTo: unknown }>,
	knownAt: string,
) {
	return sql`${table.recordedFrom} <= ${knownAt} AND (${table.recordedTo} IS NULL OR ${knownAt} < ${table.recordedTo})`;
}

function asTransactionSql(
	database: unknown,
): (strings: TemplateStringsArray, ...values: unknown[]) => unknown {
	return database as (
		strings: TemplateStringsArray,
		...values: unknown[]
	) => unknown;
}

function enqueueLegalCompanyVersionBump(
	transaction: CorporateAdministrationTransactionContext,
	input: Readonly<{
		organizationId: string;
		legalCompanyId: string;
		expectedCompanyVersion: number;
		updatedAt: string;
	}>,
): void {
	transaction.enqueue((database) => {
		const txSql = asTransactionSql(database);
		return txSql`
			UPDATE ca_legal_company
			SET
				version = ${input.expectedCompanyVersion + 1},
				updated_by = updated_by,
				updated_at = ${input.updatedAt}
			WHERE
				organization_id = ${input.organizationId}
				AND id = ${input.legalCompanyId}
				AND version = ${input.expectedCompanyVersion}
		`;
	});
}

function enqueueIdentifierScopeLock(
	transaction: CorporateAdministrationTransactionContext,
	input: Readonly<{
		organizationId: string;
		identifierType: string;
		jurisdictionCode: string;
		issuingAuthorityCode: string;
		normalizedIdentifierValue: string;
	}>,
): void {
	transaction.enqueue((database) => {
		const txSql = asTransactionSql(database);
		return txSql`SELECT pg_advisory_xact_lock(hashtextextended(${identifierLockKey(input)}, 0))`;
	});
}

function enqueueFinancialYearScopeLock(
	transaction: CorporateAdministrationTransactionContext,
	input: Readonly<{ organizationId: string; legalCompanyId: string }>,
): void {
	transaction.enqueue((database) => {
		const txSql = asTransactionSql(database);
		return txSql`SELECT pg_advisory_xact_lock(hashtextextended(${financialYearLockKey(input)}, 0))`;
	});
}

function enqueueActivityScopeLock(
	transaction: CorporateAdministrationTransactionContext,
	input: Readonly<{
		organizationId: string;
		legalCompanyId: string;
		classification: string;
		activityCode: string;
		jurisdictionCode: string;
	}>,
): void {
	transaction.enqueue((database) => {
		const txSql = asTransactionSql(database);
		return txSql`SELECT pg_advisory_xact_lock(hashtextextended(${activityLockKey(
			{
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				activityType: input.classification,
				activityCode: input.activityCode,
				jurisdictionCode: input.jurisdictionCode,
			},
		)}, 0))`;
	});
}

function identifierLockKey(
	input: Readonly<{
		organizationId: string;
		identifierType: string;
		jurisdictionCode: string;
		issuingAuthorityCode: string;
		normalizedIdentifierValue: string;
	}>,
): string {
	return [
		input.organizationId,
		input.identifierType,
		input.jurisdictionCode,
		input.issuingAuthorityCode,
		input.normalizedIdentifierValue,
	].join(":");
}

function financialYearLockKey(
	input: Readonly<{ organizationId: string; legalCompanyId: string }>,
): string {
	return `${input.organizationId}:${input.legalCompanyId}`;
}

function activityLockKey(
	input: Readonly<{
		organizationId: string;
		legalCompanyId: string;
		activityType: string;
		activityCode: string;
		jurisdictionCode: string;
	}>,
): string {
	return [
		input.organizationId,
		input.legalCompanyId,
		input.activityType,
		"default",
		input.activityCode,
		input.jurisdictionCode,
	].join(":");
}

function persistenceReturnedNoRow(entity: string): Result<never> {
	return fail(
		"SERVICE_UNAVAILABLE",
		`Corporate Administration ${entity} persistence returned no row.`,
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
			{ field: "database" },
		),
	);
}

function staleVersion(expectedVersion: number): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion },
		),
	);
}

function notFound(entityType: string): Result<never> {
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND", {
			entityType,
		}),
	);
}
