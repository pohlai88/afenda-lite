// biome-ignore-all lint/suspicious/useAwait: Drizzle officer wrappers expose uniform asynchronous store contracts.
import {
	and,
	asc,
	caOfficerAppointment,
	caOfficerQualification,
	caStatutoryOffice,
	sql as drizzleSql,
	eq,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	officerQualificationIdSchema,
	organizationIdSchema,
	statutoryOfficeIdSchema,
	userIdSchema,
} from "../../../kernel/brands";
import { canonicalDateSchema } from "../../../kernel/dates";
import type { CorporateAdministrationDrizzleDatabase } from "../../../kernel/infrastructure/drizzle-dependencies";
import { translateCorporateAdministrationInfrastructureError } from "../../../kernel/infrastructure/translate-infrastructure-error";
import {
	decodeOfficerAppointmentCursor,
	decodeStatutoryOfficeCursor,
	encodeOfficerAppointmentCursor,
	encodeStatutoryOfficeCursor,
	officerAppointmentCursorScope,
	statutoryOfficeCursorScope,
} from "../pagination";
import type { OfficerStore } from "../store";
import type {
	OfficerAppointment,
	OfficerQualification,
	StatutoryOffice,
} from "../types";

export type CorporateAdministrationDrizzleOfficerDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationOfficerStore(
	dependencies: CorporateAdministrationDrizzleOfficerDependencies,
): OfficerStore {
	return new DrizzleCorporateAdministrationOfficerStore(dependencies);
}

class DrizzleCorporateAdministrationOfficerStore implements OfficerStore {
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(dependencies: CorporateAdministrationDrizzleOfficerDependencies) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getStatutoryOffice(
		input: Parameters<OfficerStore["getStatutoryOffice"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caStatutoryOffice)
				.where(
					and(
						eq(caStatutoryOffice.organizationId, input.organizationId),
						eq(caStatutoryOffice.id, input.statutoryOfficeId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapStatutoryOffice(rows[0]);
		});
	}

	async listStatutoryOffices(
		input: Parameters<OfficerStore["listStatutoryOffices"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caStatutoryOffice)
				.where(
					and(
						eq(caStatutoryOffice.organizationId, input.organizationId),
						eq(caStatutoryOffice.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(asc(caStatutoryOffice.officeTypeCode));
			return rows.map(mapStatutoryOffice);
		});
	}

	async listRequiredStatutoryOffices(
		input: Parameters<OfficerStore["listRequiredStatutoryOffices"]>[0],
	) {
		const cursorScope = statutoryOfficeCursorScope(input);
		const cursor = decodeStatutoryOfficeCursor(input.cursor, cursorScope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caStatutoryOffice.organizationId, input.organizationId),
				eq(caStatutoryOffice.legalCompanyId, input.legalCompanyId),
				eq(caStatutoryOffice.status, "active"),
				drizzleSql`${caStatutoryOffice.effectiveFrom} <= ${input.asOf} AND ${input.asOf} < COALESCE(${caStatutoryOffice.effectiveTo}, '9999-12-31'::date)`,
			];
			if (input.jurisdictionCode !== undefined) {
				conditions.push(
					eq(caStatutoryOffice.jurisdictionCode, input.jurisdictionCode),
				);
			}
			if (input.includeOptional !== true) {
				conditions.push(eq(caStatutoryOffice.required, true));
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caStatutoryOffice.jurisdictionCode} > ${cursor.data[0]}
						OR (${caStatutoryOffice.jurisdictionCode} = ${cursor.data[0]} AND ${caStatutoryOffice.officeTypeCode} > ${cursor.data[1]})
						OR (${caStatutoryOffice.jurisdictionCode} = ${cursor.data[0]} AND ${caStatutoryOffice.officeTypeCode} = ${cursor.data[1]} AND ${caStatutoryOffice.id} > ${cursor.data[2]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caStatutoryOffice)
				.where(and(...conditions))
				.orderBy(
					asc(caStatutoryOffice.jurisdictionCode),
					asc(caStatutoryOffice.officeTypeCode),
					asc(caStatutoryOffice.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapStatutoryOffice);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize && last !== undefined
						? encodeStatutoryOfficeCursor(cursorScope, [
								last.jurisdictionCode,
								last.officeTypeCode,
								last.id,
							])
						: null,
			};
		});
	}

	async defineStatutoryOffice(
		input: Parameters<OfficerStore["defineStatutoryOffice"]>[0],
	) {
		const id = statutoryOfficeIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: StatutoryOffice = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			officeTypeCode: input.officeTypeCode,
			jurisdictionCode: input.jurisdictionCode,
			displayName: input.displayName,
			description: input.description,
			required: input.required,
			minimumHolders: input.minimumHolders,
			maximumHolders: input.maximumHolders,
			vacancyGraceDays: input.vacancyGraceDays,
			protectedRole: input.protectedRole,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			status: "active",
			retirementReason: null,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_statutory_office (id, organization_id, legal_company_id, office_type_code, jurisdiction_code, display_name, description, required, minimum_holders, maximum_holders, vacancy_grace_days, protected_role, effective_from, effective_to, status, retirement_reason, recorded_at, recorded_by, source_document_id, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.officeTypeCode}, ${input.jurisdictionCode}, ${input.displayName}, ${input.description}, ${input.required}, ${input.minimumHolders}, ${input.maximumHolders}, ${input.vacancyGraceDays}, ${input.protectedRole}, ${input.effectiveFrom}, NULL, 'active', NULL, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caStatutoryOffice).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officeTypeCode: input.officeTypeCode,
				jurisdictionCode: input.jurisdictionCode,
				displayName: input.displayName,
				description: input.description,
				required: input.required,
				minimumHolders: input.minimumHolders,
				maximumHolders: input.maximumHolders,
				vacancyGraceDays: input.vacancyGraceDays,
				protectedRole: input.protectedRole,
				effectiveFrom: input.effectiveFrom,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async getOfficerAppointment(
		input: Parameters<OfficerStore["getOfficerAppointment"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerAppointment)
				.where(
					and(
						eq(caOfficerAppointment.organizationId, input.organizationId),
						eq(caOfficerAppointment.id, input.officerAppointmentId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapOfficerAppointment(rows[0]);
		});
	}

	async listOfficerAppointments(
		input: Parameters<OfficerStore["listOfficerAppointments"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerAppointment)
				.where(
					and(
						eq(caOfficerAppointment.organizationId, input.organizationId),
						eq(caOfficerAppointment.statutoryOfficeId, input.statutoryOfficeId),
					),
				);
			return rows.map(mapOfficerAppointment);
		});
	}

	async listOfficersAsOf(
		input: Parameters<OfficerStore["listOfficersAsOf"]>[0],
	) {
		const cursorScope = officerAppointmentCursorScope(input);
		const cursor = decodeOfficerAppointmentCursor(input.cursor, cursorScope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caOfficerAppointment.organizationId, input.organizationId),
				eq(caOfficerAppointment.legalCompanyId, input.legalCompanyId),
				eq(caOfficerAppointment.status, "active"),
				drizzleSql`${caOfficerAppointment.effectiveFrom} <= ${input.asOf} AND ${input.asOf} < COALESCE(${caOfficerAppointment.effectiveTo}, '9999-12-31'::date)`,
			];
			if (input.statutoryOfficeId !== undefined) {
				conditions.push(
					eq(caOfficerAppointment.statutoryOfficeId, input.statutoryOfficeId),
				);
			}
			if (input.officerPartyId !== undefined) {
				conditions.push(
					eq(caOfficerAppointment.officerPartyId, input.officerPartyId),
				);
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caOfficerAppointment.statutoryOfficeId} > ${cursor.data[0]}
						OR (${caOfficerAppointment.statutoryOfficeId} = ${cursor.data[0]} AND ${caOfficerAppointment.effectiveFrom} > ${cursor.data[1]})
						OR (${caOfficerAppointment.statutoryOfficeId} = ${cursor.data[0]} AND ${caOfficerAppointment.effectiveFrom} = ${cursor.data[1]} AND ${caOfficerAppointment.id} > ${cursor.data[2]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caOfficerAppointment)
				.where(and(...conditions))
				.orderBy(
					asc(caOfficerAppointment.statutoryOfficeId),
					asc(caOfficerAppointment.effectiveFrom),
					asc(caOfficerAppointment.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapOfficerAppointment);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize && last !== undefined
						? encodeOfficerAppointmentCursor(cursorScope, [
								last.statutoryOfficeId,
								last.effectiveFrom,
								last.id,
							])
						: null,
			};
		});
	}

	async appointOfficer(input: Parameters<OfficerStore["appointOfficer"]>[0]) {
		const id = officerAppointmentIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row = makeAppointmentResult(input, id, now, 1, "active", null);
		const values = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			statutoryOfficeId: input.statutoryOfficeId,
			officerPartyId: input.officerPartyId,
			appointmentMethod: input.appointmentMethod,
			appointingAuthorityType: input.appointingAuthorityType,
			appointingAuthorityId: input.appointingAuthorityId,
			consentDocumentId: input.consentDocumentId,
			sourceDocumentId: input.sourceDocumentId,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			status: "active" as const,
			endReason: null,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_officer_appointment (id, organization_id, legal_company_id, statutory_office_id, officer_party_id, appointment_method, appointing_authority_type, appointing_authority_id, consent_document_id, source_document_id, effective_from, effective_to, status, end_reason, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.statutoryOfficeId}, ${input.officerPartyId}, ${input.appointmentMethod}, ${input.appointingAuthorityType}, ${input.appointingAuthorityId}, ${input.consentDocumentId}, ${input.sourceDocumentId}, ${input.effectiveFrom}, ${input.effectiveTo}, 'active', NULL, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caOfficerAppointment).values(values);
			return row;
		});
	}

	async amendOfficerAppointment(
		input: Parameters<OfficerStore["amendOfficerAppointment"]>[0],
	) {
		const current = await this.getOfficerAppointment(input);
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
		const updated: OfficerAppointment = {
			...current.data,
			appointmentMethod: input.appointmentMethod,
			appointingAuthorityType: input.appointingAuthorityType,
			appointingAuthorityId: input.appointingAuthorityId,
			consentDocumentId: input.consentDocumentId,
			sourceDocumentId: input.sourceDocumentId,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_officer_appointment SET appointment_method = ${input.appointmentMethod}, appointing_authority_type = ${input.appointingAuthorityType}, appointing_authority_id = ${input.appointingAuthorityId}, consent_document_id = ${input.consentDocumentId}, source_document_id = ${input.sourceDocumentId}, effective_from = ${input.effectiveFrom}, effective_to = ${input.effectiveTo}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.officerAppointmentId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caOfficerAppointment)
				.set({
					appointmentMethod: input.appointmentMethod,
					appointingAuthorityType: input.appointingAuthorityType,
					appointingAuthorityId: input.appointingAuthorityId,
					consentDocumentId: input.consentDocumentId,
					sourceDocumentId: input.sourceDocumentId,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caOfficerAppointment.organizationId, input.organizationId),
						eq(caOfficerAppointment.id, input.officerAppointmentId),
						eq(caOfficerAppointment.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async endOfficerAppointment(
		input: Parameters<OfficerStore["endOfficerAppointment"]>[0],
	) {
		const current = await this.getOfficerAppointment(input);
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
		const updated: OfficerAppointment = {
			...current.data,
			effectiveTo: input.endedOn,
			status: input.status,
			endReason: input.reason,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_officer_appointment SET effective_to = ${input.endedOn}, status = ${input.status}, end_reason = ${input.reason}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.officerAppointmentId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caOfficerAppointment)
				.set({
					effectiveTo: input.endedOn,
					status: input.status,
					endReason: input.reason,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caOfficerAppointment.organizationId, input.organizationId),
						eq(caOfficerAppointment.id, input.officerAppointmentId),
						eq(caOfficerAppointment.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async recordOfficerQualification(
		input: Parameters<OfficerStore["recordOfficerQualification"]>[0],
	) {
		const id = officerQualificationIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: OfficerQualification = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			officerAppointmentId: input.officerAppointmentId,
			qualificationTypeCode: input.qualificationTypeCode,
			issuer: input.issuer,
			referenceNumber: input.referenceNumber,
			validFrom: input.validFrom,
			validTo: input.validTo,
			verificationStatus: input.verificationStatus,
			verifiedAt: input.verifiedAt,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_officer_qualification (id, organization_id, legal_company_id, officer_appointment_id, qualification_type_code, issuer, reference_number, valid_from, valid_to, verification_status, verified_at, recorded_at, recorded_by, source_document_id, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.officerAppointmentId}, ${input.qualificationTypeCode}, ${input.issuer}, ${input.referenceNumber}, ${input.validFrom}, ${input.validTo}, ${input.verificationStatus}, ${input.verifiedAt}, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caOfficerQualification).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				qualificationTypeCode: input.qualificationTypeCode,
				issuer: input.issuer,
				referenceNumber: input.referenceNumber,
				validFrom: input.validFrom,
				validTo: input.validTo,
				verificationStatus: input.verificationStatus,
				verifiedAt: input.verifiedAt,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async listOfficerQualifications(
		input: Parameters<OfficerStore["listOfficerQualifications"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerQualification)
				.where(
					and(
						eq(caOfficerQualification.organizationId, input.organizationId),
						eq(
							caOfficerQualification.officerAppointmentId,
							input.officerAppointmentId,
						),
					),
				)
				.orderBy(asc(caOfficerQualification.validFrom));
			return rows.map(mapOfficerQualification);
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

function makeAppointmentResult(
	input: Parameters<OfficerStore["appointOfficer"]>[0],
	id: string,
	now: Date,
	version: number,
	status: "active" | "resigned" | "removed" | "ended",
	endReason: string | null,
): OfficerAppointment {
	return {
		id: officerAppointmentIdSchema.parse(id),
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		statutoryOfficeId: input.statutoryOfficeId,
		officerPartyId: input.officerPartyId,
		appointmentMethod: input.appointmentMethod,
		appointingAuthorityType: input.appointingAuthorityType,
		appointingAuthorityId: input.appointingAuthorityId,
		consentDocumentId: input.consentDocumentId,
		sourceDocumentId: input.sourceDocumentId,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		status,
		endReason,
		recordedAt: now,
		recordedBy: input.recordedBy,
		version,
		createdAt: now,
		updatedAt: now,
	};
}

function mapStatutoryOffice(
	row: typeof caStatutoryOffice.$inferSelect,
): StatutoryOffice {
	return {
		id: statutoryOfficeIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		officeTypeCode: row.officeTypeCode,
		jurisdictionCode: row.jurisdictionCode,
		displayName: row.displayName,
		description: row.description,
		required: row.required,
		minimumHolders: row.minimumHolders,
		maximumHolders: row.maximumHolders,
		vacancyGraceDays: row.vacancyGraceDays,
		protectedRole: row.protectedRole,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		status: row.status === "retired" ? "retired" : "active",
		retirementReason: row.retirementReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapOfficerAppointment(
	row: typeof caOfficerAppointment.$inferSelect,
): OfficerAppointment {
	return {
		id: officerAppointmentIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		statutoryOfficeId: statutoryOfficeIdSchema.parse(row.statutoryOfficeId),
		officerPartyId: row.officerPartyId,
		appointmentMethod:
			row.appointmentMethod === "shareholder_resolution" ||
			row.appointmentMethod === "statutory_filing" ||
			row.appointmentMethod === "delegated_authority" ||
			row.appointmentMethod === "court_order" ||
			row.appointmentMethod === "other"
				? row.appointmentMethod
				: "board_resolution",
		appointingAuthorityType:
			row.appointingAuthorityType === "shareholder_body" ||
			row.appointingAuthorityType === "statutory_authority" ||
			row.appointingAuthorityType === "court" ||
			row.appointingAuthorityType === "delegated_role" ||
			row.appointingAuthorityType === "other"
				? row.appointingAuthorityType
				: "governance_body",
		appointingAuthorityId: row.appointingAuthorityId,
		consentDocumentId: row.consentDocumentId,
		sourceDocumentId: row.sourceDocumentId,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		status:
			row.status === "resigned" ||
			row.status === "removed" ||
			row.status === "ended"
				? row.status
				: "active",
		endReason: row.endReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapOfficerQualification(
	row: typeof caOfficerQualification.$inferSelect,
): OfficerQualification {
	return {
		id: officerQualificationIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		officerAppointmentId: officerAppointmentIdSchema.parse(
			row.officerAppointmentId,
		),
		qualificationTypeCode: row.qualificationTypeCode,
		issuer: row.issuer,
		referenceNumber: row.referenceNumber,
		validFrom: canonicalDateSchema.parse(row.validFrom),
		validTo:
			row.validTo === null ? null : canonicalDateSchema.parse(row.validTo),
		verificationStatus:
			row.verificationStatus === "verified" ||
			row.verificationStatus === "rejected" ||
			row.verificationStatus === "expired"
				? row.verificationStatus
				: "pending",
		verifiedAt: row.verifiedAt,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
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
