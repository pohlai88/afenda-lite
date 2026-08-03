// biome-ignore-all lint/suspicious/useAwait: Drizzle authority wrappers expose uniform asynchronous store contracts.
import {
	and,
	asc,
	caAuthorityMandate,
	caOfficerAppointment,
	sql as drizzleSql,
	eq,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	authorityMandateIdSchema,
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	organizationIdSchema,
	resolutionIdSchema,
	userIdSchema,
} from "../../../kernel/brands";
import { canonicalDateSchema } from "../../../kernel/dates";
import { canonicalDecimalSchema } from "../../../kernel/decimals";
import type { CorporateAdministrationDrizzleDatabase } from "../../../kernel/infrastructure/drizzle-dependencies";
import { translateCorporateAdministrationInfrastructureError } from "../../../kernel/infrastructure/translate-infrastructure-error";
import {
	authorityMandateCursorScope,
	decodeAuthorityMandateCursor,
	encodeAuthorityMandateCursor,
} from "../pagination";
import type {
	AuthorityMandateStore,
	OfficerAppointmentReferencePort,
} from "../store";
import type { AuthorityMandate } from "../types";

export type CorporateAdministrationDrizzleAuthorityDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationAuthorityStore(
	dependencies: CorporateAdministrationDrizzleAuthorityDependencies,
): AuthorityMandateStore & OfficerAppointmentReferencePort {
	return new DrizzleCorporateAdministrationAuthorityStore(dependencies);
}

class DrizzleCorporateAdministrationAuthorityStore
	implements AuthorityMandateStore, OfficerAppointmentReferencePort
{
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleAuthorityDependencies,
	) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getAuthorityMandate(
		input: Parameters<AuthorityMandateStore["getAuthorityMandate"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caAuthorityMandate)
				.where(
					and(
						eq(caAuthorityMandate.organizationId, input.organizationId),
						eq(caAuthorityMandate.id, input.authorityMandateId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapAuthorityMandate(rows[0]);
		});
	}

	async getOfficerAppointmentReference(
		input: Parameters<
			OfficerAppointmentReferencePort["getOfficerAppointmentReference"]
		>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select({
					id: caOfficerAppointment.id,
					status: caOfficerAppointment.status,
				})
				.from(caOfficerAppointment)
				.where(
					and(
						eq(caOfficerAppointment.organizationId, input.organizationId),
						eq(caOfficerAppointment.id, input.officerAppointmentId),
					),
				)
				.limit(1);
			const [row] = rows;
			return row === undefined
				? null
				: {
						id: officerAppointmentIdSchema.parse(row.id),
						status: row.status,
					};
		});
	}

	async listAuthorityMandatesAsOf(
		input: Parameters<AuthorityMandateStore["listAuthorityMandatesAsOf"]>[0],
	) {
		const cursorScope = authorityMandateCursorScope(input);
		const cursor = decodeAuthorityMandateCursor(input.cursor, cursorScope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caAuthorityMandate.organizationId, input.organizationId),
				eq(caAuthorityMandate.legalCompanyId, input.legalCompanyId),
				eq(caAuthorityMandate.status, "active"),
				drizzleSql`${caAuthorityMandate.effectiveFrom} <= ${input.asOf} AND ${input.asOf} < COALESCE(${caAuthorityMandate.effectiveTo}, '9999-12-31'::date)`,
			];
			if (input.mandateType !== undefined) {
				conditions.push(eq(caAuthorityMandate.mandateType, input.mandateType));
			}
			if (input.holderPartyId !== undefined) {
				conditions.push(
					eq(caAuthorityMandate.holderPartyId, input.holderPartyId),
				);
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caAuthorityMandate.effectiveFrom} > ${cursor.data[0]}
						OR (${caAuthorityMandate.effectiveFrom} = ${cursor.data[0]} AND ${caAuthorityMandate.id} > ${cursor.data[1]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caAuthorityMandate)
				.where(and(...conditions))
				.orderBy(
					asc(caAuthorityMandate.effectiveFrom),
					asc(caAuthorityMandate.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapAuthorityMandate);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize && last !== undefined
						? encodeAuthorityMandateCursor(cursorScope, [
								last.effectiveFrom,
								last.id,
							])
						: null,
			};
		});
	}

	async grantAuthorityMandate(
		input: Parameters<AuthorityMandateStore["grantAuthorityMandate"]>[0],
	) {
		const id = authorityMandateIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: AuthorityMandate = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			mandateType: input.mandateType,
			holderPartyId: input.holderPartyId,
			holderOfficerAppointmentId: input.holderOfficerAppointmentId,
			grantedByType: input.grantedByType,
			grantingResolutionId: input.grantingResolutionId,
			scopeDescription: input.scopeDescription,
			monetaryLimitAmount: input.monetaryLimitAmount,
			monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
			jurisdictionCode: input.jurisdictionCode,
			protectedAuthority: input.protectedAuthority,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			status: "active",
			revocationReason: null,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_authority_mandate (id, organization_id, legal_company_id, mandate_type, holder_party_id, holder_officer_appointment_id, granted_by_type, granting_resolution_id, scope_description, monetary_limit_amount, monetary_limit_currency_code, jurisdiction_code, protected_authority, effective_from, effective_to, status, revocation_reason, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.mandateType}, ${input.holderPartyId}, ${input.holderOfficerAppointmentId}, ${input.grantedByType}, ${input.grantingResolutionId}, ${input.scopeDescription}, ${input.monetaryLimitAmount}, ${input.monetaryLimitCurrencyCode}, ${input.jurisdictionCode}, ${input.protectedAuthority}, ${input.effectiveFrom}, ${input.effectiveTo}, 'active', NULL, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caAuthorityMandate).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				mandateType: input.mandateType,
				holderPartyId: input.holderPartyId,
				holderOfficerAppointmentId: input.holderOfficerAppointmentId,
				grantedByType: input.grantedByType,
				grantingResolutionId: input.grantingResolutionId,
				scopeDescription: input.scopeDescription,
				monetaryLimitAmount: input.monetaryLimitAmount,
				monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
				jurisdictionCode: input.jurisdictionCode,
				protectedAuthority: input.protectedAuthority,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				status: "active" as const,
				revocationReason: null,
				sourceDocumentId: input.sourceDocumentId,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async amendAuthorityMandate(
		input: Parameters<AuthorityMandateStore["amendAuthorityMandate"]>[0],
	) {
		const current = await this.getAuthorityMandate(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: AuthorityMandate = {
			...current.data,
			scopeDescription: input.scopeDescription,
			monetaryLimitAmount: input.monetaryLimitAmount,
			monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
			jurisdictionCode: input.jurisdictionCode,
			effectiveTo: input.effectiveTo,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_authority_mandate SET scope_description = ${input.scopeDescription}, monetary_limit_amount = ${input.monetaryLimitAmount}, monetary_limit_currency_code = ${input.monetaryLimitCurrencyCode}, jurisdiction_code = ${input.jurisdictionCode}, effective_to = ${input.effectiveTo}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.authorityMandateId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caAuthorityMandate)
				.set({
					scopeDescription: input.scopeDescription,
					monetaryLimitAmount: input.monetaryLimitAmount,
					monetaryLimitCurrencyCode: input.monetaryLimitCurrencyCode,
					jurisdictionCode: input.jurisdictionCode,
					effectiveTo: input.effectiveTo,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caAuthorityMandate.organizationId, input.organizationId),
						eq(caAuthorityMandate.id, input.authorityMandateId),
						eq(caAuthorityMandate.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async revokeAuthorityMandate(
		input: Parameters<AuthorityMandateStore["revokeAuthorityMandate"]>[0],
	) {
		const current = await this.getAuthorityMandate(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const now = new Date(input.recordedAt);
		const updated: AuthorityMandate = {
			...current.data,
			effectiveTo: input.revokedOn,
			status: "revoked",
			revocationReason: input.reason,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_authority_mandate SET effective_to = ${input.revokedOn}, status = 'revoked', revocation_reason = ${input.reason}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.authorityMandateId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caAuthorityMandate)
				.set({
					effectiveTo: input.revokedOn,
					status: "revoked",
					revocationReason: input.reason,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caAuthorityMandate.organizationId, input.organizationId),
						eq(caAuthorityMandate.id, input.authorityMandateId),
						eq(caAuthorityMandate.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async #read<T>(work: () => Promise<T>): Promise<Result<T>> {
		try {
			return errorResult.ok(await work());
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) {
				return translated;
			}
			throw error;
		}
	}

	async #write<T>(work: () => Promise<T>): Promise<Result<T>> {
		return this.#read(work);
	}
}

function mapAuthorityMandate(
	row: typeof caAuthorityMandate.$inferSelect,
): AuthorityMandate {
	return {
		id: authorityMandateIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		mandateType:
			row.mandateType === "bank_mandate" ||
			row.mandateType === "power_of_attorney" ||
			row.mandateType === "delegated_authority" ||
			row.mandateType === "other"
				? row.mandateType
				: "signing_authority",
		holderPartyId: row.holderPartyId,
		holderOfficerAppointmentId:
			row.holderOfficerAppointmentId === null
				? null
				: officerAppointmentIdSchema.parse(row.holderOfficerAppointmentId),
		grantedByType:
			row.grantedByType === "shareholder_resolution" ||
			row.grantedByType === "statutory_office" ||
			row.grantedByType === "power_of_attorney"
				? row.grantedByType
				: "board_resolution",
		grantingResolutionId:
			row.grantingResolutionId === null
				? null
				: resolutionIdSchema.parse(row.grantingResolutionId),
		scopeDescription: row.scopeDescription,
		monetaryLimitAmount:
			row.monetaryLimitAmount === null
				? null
				: canonicalDecimalSchema.parse(row.monetaryLimitAmount),
		monetaryLimitCurrencyCode: row.monetaryLimitCurrencyCode,
		jurisdictionCode: row.jurisdictionCode,
		protectedAuthority: row.protectedAuthority,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		status:
			row.status === "revoked" || row.status === "expired"
				? row.status
				: "active",
		revocationReason: row.revocationReason,
		sourceDocumentId: row.sourceDocumentId,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function asSql(
	database: unknown,
): (strings: TemplateStringsArray, ...values: unknown[]) => unknown {
	return database as (
		strings: TemplateStringsArray,
		...values: unknown[]
	) => unknown;
}

function notFound(): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}
