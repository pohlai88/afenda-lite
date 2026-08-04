// biome-ignore-all lint/suspicious/useAwait: Drizzle compliance wrappers expose uniform asynchronous store contracts.
import {
	and,
	asc,
	caConflictDisclosure,
	caOfficerDeclaration,
	caOfficerDisqualification,
	sql as drizzleSql,
	eq,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	legalCompanyIdSchema,
	officerAppointmentIdSchema,
	officerConflictDisclosureIdSchema,
	officerDeclarationIdSchema,
	officerDisqualificationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../../kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
} from "../../../kernel/dates";
import type { CorporateAdministrationDrizzleDatabase } from "../../../kernel/infrastructure/drizzle-dependencies";
import { translateCorporateAdministrationInfrastructureError } from "../../../kernel/infrastructure/translate-infrastructure-error";
import {
	activeDisqualificationCursorScope,
	conflictForMatterCursorScope,
	decodeActiveDisqualificationCursor,
	decodeConflictForMatterCursor,
	decodeExpiringDeclarationCursor,
	encodeActiveDisqualificationCursor,
	encodeConflictForMatterCursor,
	encodeExpiringDeclarationCursor,
	expiringDeclarationCursorScope,
} from "../compliance-pagination";
import { declarationExpiryWindowEnd } from "../compliance-rules";
import type { OfficerComplianceStore } from "../compliance-store";
import type {
	ConflictDisclosure,
	OfficerDeclaration,
	OfficerDisqualification,
} from "../compliance-types";

export type CorporateAdministrationDrizzleOfficerComplianceDependencies =
	Readonly<{
		database: CorporateAdministrationDrizzleDatabase;
		createId: () => string;
	}>;

export function createDrizzleCorporateAdministrationOfficerComplianceStore(
	dependencies: CorporateAdministrationDrizzleOfficerComplianceDependencies,
): OfficerComplianceStore {
	return new DrizzleCorporateAdministrationOfficerComplianceStore(dependencies);
}

class DrizzleCorporateAdministrationOfficerComplianceStore
	implements OfficerComplianceStore
{
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleOfficerComplianceDependencies,
	) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getOfficerDeclaration(
		input: Parameters<OfficerComplianceStore["getOfficerDeclaration"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerDeclaration)
				.where(
					and(
						eq(caOfficerDeclaration.organizationId, input.organizationId),
						eq(caOfficerDeclaration.id, input.officerDeclarationId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapDeclaration(rows[0]);
		});
	}

	async listOfficerDeclarations(
		input: Parameters<OfficerComplianceStore["listOfficerDeclarations"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerDeclaration)
				.where(
					and(
						eq(caOfficerDeclaration.organizationId, input.organizationId),
						eq(
							caOfficerDeclaration.officerAppointmentId,
							input.officerAppointmentId,
						),
					),
				)
				.orderBy(asc(caOfficerDeclaration.effectiveFrom));
			return rows.map(mapDeclaration);
		});
	}

	async listExpiringDeclarations(
		input: Parameters<OfficerComplianceStore["listExpiringDeclarations"]>[0],
	) {
		const cursorScope = expiringDeclarationCursorScope(input);
		const cursor = decodeExpiringDeclarationCursor(input.cursor, cursorScope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const windowEnd = declarationExpiryWindowEnd(input);
			const conditions = [
				eq(caOfficerDeclaration.organizationId, input.organizationId),
				eq(caOfficerDeclaration.legalCompanyId, input.legalCompanyId),
				eq(caOfficerDeclaration.status, "active"),
				drizzleSql`${caOfficerDeclaration.expiresOn} >= ${input.asOf}`,
				drizzleSql`${caOfficerDeclaration.expiresOn} <= ${windowEnd}`,
			];
			if (input.declarationType !== undefined) {
				conditions.push(
					eq(caOfficerDeclaration.declarationType, input.declarationType),
				);
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caOfficerDeclaration.expiresOn} > ${cursor.data[0]}
						OR (${caOfficerDeclaration.expiresOn} = ${cursor.data[0]} AND ${caOfficerDeclaration.id} > ${cursor.data[1]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caOfficerDeclaration)
				.where(and(...conditions))
				.orderBy(
					asc(caOfficerDeclaration.expiresOn),
					asc(caOfficerDeclaration.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapDeclaration);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize &&
					last?.expiresOn !== null &&
					last !== undefined
						? encodeExpiringDeclarationCursor(cursorScope, [
								last.expiresOn,
								last.id,
							])
						: null,
			};
		});
	}

	async recordOfficerDeclaration(
		input: Parameters<OfficerComplianceStore["recordOfficerDeclaration"]>[0],
	) {
		const id = officerDeclarationIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: OfficerDeclaration = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			officerAppointmentId: input.officerAppointmentId,
			declarationType: input.declarationType,
			status: "active",
			effectiveFrom: input.effectiveFrom,
			expiresOn: input.expiresOn,
			sensitiveDetailRef: input.sensitiveDetailRef,
			maskedSummary: input.maskedSummary,
			sourceDocumentId: input.sourceDocumentId,
			supersededAt: null,
			supersededByDeclarationId: null,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_officer_declaration (id, organization_id, legal_company_id, officer_appointment_id, declaration_type, status, effective_from, expires_on, sensitive_detail_ref, masked_summary, source_document_id, superseded_at, superseded_by_declaration_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.officerAppointmentId}, ${input.declarationType}, 'active', ${input.effectiveFrom}, ${input.expiresOn}, ${input.sensitiveDetailRef}, ${input.maskedSummary}, ${input.sourceDocumentId}, NULL, NULL, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caOfficerDeclaration).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				declarationType: input.declarationType,
				status: "active",
				effectiveFrom: input.effectiveFrom,
				expiresOn: input.expiresOn,
				sensitiveDetailRef: input.sensitiveDetailRef,
				maskedSummary: input.maskedSummary,
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

	async supersedeOfficerDeclaration(
		input: Parameters<OfficerComplianceStore["supersedeOfficerDeclaration"]>[0],
	) {
		const current = await this.getOfficerDeclaration(input);
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
		const updated: OfficerDeclaration = {
			...current.data,
			status: "superseded",
			sourceDocumentId: input.sourceDocumentId,
			supersededAt: now,
			supersededByDeclarationId: input.supersededByDeclarationId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_officer_declaration SET status = 'superseded', source_document_id = ${input.sourceDocumentId}, superseded_at = ${now}, superseded_by_declaration_id = ${input.supersededByDeclarationId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.officerDeclarationId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caOfficerDeclaration)
				.set({
					status: "superseded",
					sourceDocumentId: input.sourceDocumentId,
					supersededAt: now,
					supersededByDeclarationId: input.supersededByDeclarationId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caOfficerDeclaration.organizationId, input.organizationId),
						eq(caOfficerDeclaration.id, input.officerDeclarationId),
						eq(caOfficerDeclaration.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async getOfficerDisqualification(
		input: Parameters<OfficerComplianceStore["getOfficerDisqualification"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerDisqualification)
				.where(
					and(
						eq(caOfficerDisqualification.organizationId, input.organizationId),
						eq(caOfficerDisqualification.id, input.officerDisqualificationId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapDisqualification(rows[0]);
		});
	}

	async listOfficerDisqualifications(
		input: Parameters<
			OfficerComplianceStore["listOfficerDisqualifications"]
		>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caOfficerDisqualification)
				.where(
					and(
						eq(caOfficerDisqualification.organizationId, input.organizationId),
						eq(
							caOfficerDisqualification.officerAppointmentId,
							input.officerAppointmentId,
						),
					),
				);
			return rows.map(mapDisqualification);
		});
	}

	async listActiveDisqualifications(
		input: Parameters<OfficerComplianceStore["listActiveDisqualifications"]>[0],
	) {
		const cursorScope = activeDisqualificationCursorScope(input);
		const cursor = decodeActiveDisqualificationCursor(
			input.cursor,
			cursorScope,
		);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caOfficerDisqualification.organizationId, input.organizationId),
				eq(caOfficerDisqualification.legalCompanyId, input.legalCompanyId),
				eq(caOfficerDisqualification.status, "active"),
				drizzleSql`${caOfficerDisqualification.effectiveFrom} <= ${input.asOf} AND ${input.asOf} < COALESCE(${caOfficerDisqualification.effectiveTo}, '9999-12-31'::date)`,
			];
			if (input.officerAppointmentId !== undefined) {
				conditions.push(
					eq(
						caOfficerDisqualification.officerAppointmentId,
						input.officerAppointmentId,
					),
				);
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caOfficerDisqualification.officerAppointmentId} > ${cursor.data[0]}
						OR (${caOfficerDisqualification.officerAppointmentId} = ${cursor.data[0]} AND ${caOfficerDisqualification.effectiveFrom} > ${cursor.data[1]})
						OR (${caOfficerDisqualification.officerAppointmentId} = ${cursor.data[0]} AND ${caOfficerDisqualification.effectiveFrom} = ${cursor.data[1]} AND ${caOfficerDisqualification.id} > ${cursor.data[2]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caOfficerDisqualification)
				.where(and(...conditions))
				.orderBy(
					asc(caOfficerDisqualification.officerAppointmentId),
					asc(caOfficerDisqualification.effectiveFrom),
					asc(caOfficerDisqualification.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapDisqualification);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize && last !== undefined
						? encodeActiveDisqualificationCursor(cursorScope, [
								last.officerAppointmentId,
								last.effectiveFrom,
								last.id,
							])
						: null,
			};
		});
	}

	async recordOfficerDisqualification(
		input: Parameters<
			OfficerComplianceStore["recordOfficerDisqualification"]
		>[0],
	) {
		const id = officerDisqualificationIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: OfficerDisqualification = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			officerAppointmentId: input.officerAppointmentId,
			reasonCode: input.reasonCode,
			authorityReference: input.authorityReference,
			sourceDocumentId: input.sourceDocumentId,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			status: "active",
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
				return sql`INSERT INTO ca_officer_disqualification (id, organization_id, legal_company_id, officer_appointment_id, reason_code, authority_reference, source_document_id, effective_from, effective_to, status, end_reason, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.officerAppointmentId}, ${input.reasonCode}, ${input.authorityReference}, ${input.sourceDocumentId}, ${input.effectiveFrom}, ${input.effectiveTo}, 'active', NULL, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caOfficerDisqualification).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				reasonCode: input.reasonCode,
				authorityReference: input.authorityReference,
				sourceDocumentId: input.sourceDocumentId,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				status: "active",
				endReason: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			return row;
		});
	}

	async endOfficerDisqualification(
		input: Parameters<OfficerComplianceStore["endOfficerDisqualification"]>[0],
	) {
		const current = await this.getOfficerDisqualification(input);
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
		const updated: OfficerDisqualification = {
			...current.data,
			effectiveTo: input.endedOn,
			status: "ended",
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
				return sql`UPDATE ca_officer_disqualification SET effective_to = ${input.endedOn}, status = 'ended', end_reason = ${input.reason}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.officerDisqualificationId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caOfficerDisqualification)
				.set({
					effectiveTo: input.endedOn,
					status: "ended",
					endReason: input.reason,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caOfficerDisqualification.organizationId, input.organizationId),
						eq(caOfficerDisqualification.id, input.officerDisqualificationId),
						eq(caOfficerDisqualification.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async getConflictDisclosure(
		input: Parameters<OfficerComplianceStore["getConflictDisclosure"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caConflictDisclosure)
				.where(
					and(
						eq(caConflictDisclosure.organizationId, input.organizationId),
						eq(caConflictDisclosure.id, input.conflictDisclosureId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapConflict(rows[0]);
		});
	}

	async listConflictsForMatter(
		input: Parameters<OfficerComplianceStore["listConflictsForMatter"]>[0],
	) {
		const cursorScope = conflictForMatterCursorScope(input);
		const cursor = decodeConflictForMatterCursor(input.cursor, cursorScope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caConflictDisclosure.organizationId, input.organizationId),
				eq(caConflictDisclosure.legalCompanyId, input.legalCompanyId),
				eq(caConflictDisclosure.matterType, input.matterType),
				eq(caConflictDisclosure.matterId, input.matterId),
			];
			if (input.includeCleared !== true) {
				conditions.push(
					drizzleSql`${caConflictDisclosure.status} <> 'cleared'`,
				);
			}
			if (cursor.data !== null) {
				conditions.push(
					drizzleSql`(
						${caConflictDisclosure.disclosedAt} > ${cursor.data[0]}
						OR (${caConflictDisclosure.disclosedAt} = ${cursor.data[0]} AND ${caConflictDisclosure.id} > ${cursor.data[1]})
					)`,
				);
			}
			const pageSize = input.pageSize ?? 50;
			const rows = await this.#database
				.select()
				.from(caConflictDisclosure)
				.where(and(...conditions))
				.orderBy(
					asc(caConflictDisclosure.disclosedAt),
					asc(caConflictDisclosure.id),
				)
				.limit(pageSize + 1);
			const pageRows = rows.slice(0, pageSize).map(mapConflict);
			const last = pageRows.at(-1);
			return {
				items: pageRows,
				nextCursor:
					rows.length > pageSize && last !== undefined
						? encodeConflictForMatterCursor(cursorScope, [
								canonicalInstantSchema.parse(last.disclosedAt.toISOString()),
								last.id,
							])
						: null,
			};
		});
	}

	async discloseConflict(
		input: Parameters<OfficerComplianceStore["discloseConflict"]>[0],
	) {
		const id = officerConflictDisclosureIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: ConflictDisclosure = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			officerAppointmentId: input.officerAppointmentId,
			matterType: input.matterType,
			matterId: input.matterId,
			conflictTypeCode: input.conflictTypeCode,
			status: "disclosed",
			sensitiveDetailRef: input.sensitiveDetailRef,
			maskedSummary: input.maskedSummary,
			disclosedAt: input.disclosedAt,
			recusalRecordedAt: null,
			recusalReason: null,
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
				return sql`INSERT INTO ca_conflict_disclosure (id, organization_id, legal_company_id, officer_appointment_id, matter_type, matter_id, conflict_type_code, status, sensitive_detail_ref, masked_summary, disclosed_at, recusal_recorded_at, recusal_reason, source_document_id, recorded_at, recorded_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.officerAppointmentId}, ${input.matterType}, ${input.matterId}, ${input.conflictTypeCode}, 'disclosed', ${input.sensitiveDetailRef}, ${input.maskedSummary}, ${input.disclosedAt}, NULL, NULL, ${input.sourceDocumentId}, ${now}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caConflictDisclosure).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				officerAppointmentId: input.officerAppointmentId,
				matterType: input.matterType,
				matterId: input.matterId,
				conflictTypeCode: input.conflictTypeCode,
				status: "disclosed",
				sensitiveDetailRef: input.sensitiveDetailRef,
				maskedSummary: input.maskedSummary,
				disclosedAt: input.disclosedAt,
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

	async recordRecusal(
		input: Parameters<OfficerComplianceStore["recordRecusal"]>[0],
	) {
		const current = await this.getConflictDisclosure(input);
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
		const updated: ConflictDisclosure = {
			...current.data,
			status: "recused",
			recusalRecordedAt: now,
			recusalReason: input.recusalReason,
			sourceDocumentId: input.sourceDocumentId,
			recordedAt: now,
			recordedBy: input.recordedBy,
			version: current.data.version + 1,
			updatedAt: now,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_conflict_disclosure SET status = 'recused', recusal_recorded_at = ${now}, recusal_reason = ${input.recusalReason}, source_document_id = ${input.sourceDocumentId}, recorded_at = ${now}, recorded_by = ${input.recordedBy}, version = version + 1, updated_at = ${now} WHERE organization_id = ${input.organizationId} AND id = ${input.conflictDisclosureId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caConflictDisclosure)
				.set({
					status: "recused",
					recusalRecordedAt: now,
					recusalReason: input.recusalReason,
					sourceDocumentId: input.sourceDocumentId,
					recordedAt: now,
					recordedBy: input.recordedBy,
					version: updated.version,
					updatedAt: now,
				})
				.where(
					and(
						eq(caConflictDisclosure.organizationId, input.organizationId),
						eq(caConflictDisclosure.id, input.conflictDisclosureId),
						eq(caConflictDisclosure.version, input.expectedVersion),
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

function mapDeclaration(
	row: typeof caOfficerDeclaration.$inferSelect,
): OfficerDeclaration {
	return {
		id: officerDeclarationIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		officerAppointmentId: officerAppointmentIdSchema.parse(
			row.officerAppointmentId,
		),
		declarationType:
			row.declarationType === "eligibility" ||
			row.declarationType === "interest" ||
			row.declarationType === "independence" ||
			row.declarationType === "fit_and_proper" ||
			row.declarationType === "related_party"
				? row.declarationType
				: "consent",
		status:
			row.status === "superseded" || row.status === "expired"
				? row.status
				: "active",
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		expiresOn:
			row.expiresOn === null ? null : canonicalDateSchema.parse(row.expiresOn),
		sensitiveDetailRef: row.sensitiveDetailRef,
		maskedSummary: row.maskedSummary,
		sourceDocumentId: row.sourceDocumentId,
		supersededAt: row.supersededAt,
		supersededByDeclarationId:
			row.supersededByDeclarationId === null
				? null
				: officerDeclarationIdSchema.parse(row.supersededByDeclarationId),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapDisqualification(
	row: typeof caOfficerDisqualification.$inferSelect,
): OfficerDisqualification {
	return {
		id: officerDisqualificationIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		officerAppointmentId: officerAppointmentIdSchema.parse(
			row.officerAppointmentId,
		),
		reasonCode: row.reasonCode,
		authorityReference: row.authorityReference,
		sourceDocumentId: row.sourceDocumentId,
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		status: row.status === "ended" ? "ended" : "active",
		endReason: row.endReason,
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		version: row.version,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapConflict(
	row: typeof caConflictDisclosure.$inferSelect,
): ConflictDisclosure {
	return {
		id: officerConflictDisclosureIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		officerAppointmentId: officerAppointmentIdSchema.parse(
			row.officerAppointmentId,
		),
		matterType:
			row.matterType === "resolution" ||
			row.matterType === "transaction" ||
			row.matterType === "corporate_action"
				? row.matterType
				: "meeting",
		matterId: row.matterId,
		conflictTypeCode: row.conflictTypeCode,
		status:
			row.status === "recused" || row.status === "cleared"
				? row.status
				: "disclosed",
		sensitiveDetailRef: row.sensitiveDetailRef,
		maskedSummary: row.maskedSummary,
		disclosedAt: row.disclosedAt,
		recusalRecordedAt: row.recusalRecordedAt,
		recusalReason: row.recusalReason,
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
