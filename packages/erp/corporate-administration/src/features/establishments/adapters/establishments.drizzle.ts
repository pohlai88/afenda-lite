// biome-ignore-all lint/suspicious/useAwait: Drizzle establishment wrappers expose uniform asynchronous store contracts.
// biome-ignore-all lint/style/useDestructuring: Guarded result indexing keeps affected-row handling explicit.
import {
	and,
	asc,
	caEstablishmentStatusHistory,
	caLegalEstablishment,
	caPremise,
	caRegisteredAddress,
	eq,
	sql as querySql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	establishmentStatusHistoryIdSchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
	premiseIdSchema,
	registeredAddressIdSchema,
	userIdSchema,
} from "../../../kernel/brands";
import { canonicalDateSchema } from "../../../kernel/dates";
import type { CorporateAdministrationDrizzleDatabase } from "../../../kernel/infrastructure/drizzle-dependencies";
import { translateCorporateAdministrationInfrastructureError } from "../../../kernel/infrastructure/translate-infrastructure-error";
import {
	decodeLegalEstablishmentCursor,
	decodePremiseCursor,
	encodeLegalEstablishmentCursor,
	encodePremiseCursor,
	legalEstablishmentCursorScope,
	premiseCursorScope,
} from "../pagination";
import { matchesEstablishmentAsOf, visibleAtKnownTime } from "../rules";
import {
	legalEstablishmentStatusSchema,
	legalEstablishmentTypeSchema,
	premiseTypeSchema,
} from "../schemas";
import type { EstablishmentStore } from "../store";
import type {
	EstablishmentStatusHistory,
	LegalEstablishment,
	Premise,
	RegisteredAddress,
} from "../types";

export type CorporateAdministrationDrizzleEstablishmentDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createId: () => string;
}>;

export function createDrizzleCorporateAdministrationEstablishmentStore(
	dependencies: CorporateAdministrationDrizzleEstablishmentDependencies,
): EstablishmentStore {
	return new DrizzleCorporateAdministrationEstablishmentStore(dependencies);
}

class DrizzleCorporateAdministrationEstablishmentStore
	implements EstablishmentStore
{
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createId: () => string;

	constructor(
		dependencies: CorporateAdministrationDrizzleEstablishmentDependencies,
	) {
		this.#database = dependencies.database;
		this.#createId = dependencies.createId;
	}

	async getLegalEstablishment(
		input: Parameters<EstablishmentStore["getLegalEstablishment"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caLegalEstablishment)
				.where(
					and(
						eq(caLegalEstablishment.organizationId, input.organizationId),
						eq(caLegalEstablishment.id, input.legalEstablishmentId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapEstablishment(rows[0]);
		});
	}

	async listLegalEstablishmentsAsOf(
		input: Parameters<EstablishmentStore["listLegalEstablishmentsAsOf"]>[0],
	) {
		const scope = legalEstablishmentCursorScope(input);
		const cursor = decodeLegalEstablishmentCursor(
			input.pagination.cursor,
			scope,
		);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const establishmentOrganizationId = querySql.raw(
				'"ca_legal_establishment"."organization_id"',
			);
			const establishmentId = querySql.raw('"ca_legal_establishment"."id"');
			const knownAtPredicate =
				input.knownAt === undefined
					? querySql``
					: querySql`AND history.recorded_at <= ${input.knownAt}`;
			const statusAsOf = querySql<string | null>`(
				SELECT history.status
				FROM ca_establishment_status_history AS history
				WHERE history.organization_id = ${establishmentOrganizationId}
					AND history.legal_establishment_id = ${establishmentId}
					AND history.effective_from <= ${input.asOf}
					AND (history.effective_to IS NULL OR ${input.asOf} < history.effective_to)
					${knownAtPredicate}
				ORDER BY history.effective_from DESC, history.recorded_at DESC, history.id DESC
				LIMIT 1
			)`;
			const conditions = [
				eq(caLegalEstablishment.organizationId, input.organizationId),
				eq(caLegalEstablishment.legalCompanyId, input.legalCompanyId),
				querySql`${caLegalEstablishment.registeredFrom} <= ${input.asOf}`,
				querySql`${statusAsOf} IS NOT NULL`,
			];
			if (input.status !== undefined) {
				conditions.push(querySql`${statusAsOf} = ${input.status}`);
			}
			if (cursor.data !== null) {
				conditions.push(querySql`(
					${caLegalEstablishment.establishmentType} > ${cursor.data[0]}
					OR (${caLegalEstablishment.establishmentType} = ${cursor.data[0]} AND ${caLegalEstablishment.jurisdictionCode} > ${cursor.data[1]})
					OR (${caLegalEstablishment.establishmentType} = ${cursor.data[0]} AND ${caLegalEstablishment.jurisdictionCode} = ${cursor.data[1]} AND ${caLegalEstablishment.normalizedRegistrationIdentifier} > ${cursor.data[2]})
					OR (${caLegalEstablishment.establishmentType} = ${cursor.data[0]} AND ${caLegalEstablishment.jurisdictionCode} = ${cursor.data[1]} AND ${caLegalEstablishment.normalizedRegistrationIdentifier} = ${cursor.data[2]} AND ${caLegalEstablishment.id} > ${cursor.data[3]})
				)`);
			}
			const rows = await this.#database
				.select({
					establishment: caLegalEstablishment,
					resolvedStatus: statusAsOf.as("resolved_status"),
				})
				.from(caLegalEstablishment)
				.where(and(...conditions))
				.orderBy(
					asc(caLegalEstablishment.establishmentType),
					asc(caLegalEstablishment.jurisdictionCode),
					asc(caLegalEstablishment.normalizedRegistrationIdentifier),
					asc(caLegalEstablishment.id),
				)
				.limit(input.pagination.limit + 1);
			const pageRows = rows.slice(0, input.pagination.limit);
			const items = pageRows.map((selected) => ({
				...mapEstablishment(selected.establishment),
				currentStatus: mapEstablishmentStatus(selected.resolvedStatus),
			}));
			const last = pageRows.at(-1)?.establishment;
			return {
				items,
				nextCursor:
					rows.length > input.pagination.limit && last !== undefined
						? encodeLegalEstablishmentCursor(scope, [
								mapEstablishmentType(last.establishmentType),
								last.jurisdictionCode,
								last.normalizedRegistrationIdentifier,
								legalEstablishmentIdSchema.parse(last.id),
							])
						: null,
			};
		});
	}

	async listEstablishmentStatusHistory(
		input: Parameters<EstablishmentStore["listEstablishmentStatusHistory"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caEstablishmentStatusHistory)
				.where(
					and(
						eq(
							caEstablishmentStatusHistory.organizationId,
							input.organizationId,
						),
						eq(
							caEstablishmentStatusHistory.legalEstablishmentId,
							input.legalEstablishmentId,
						),
					),
				)
				.orderBy(asc(caEstablishmentStatusHistory.effectiveFrom));
			return rows.map(mapStatusHistory);
		});
	}

	async registerLegalEstablishment(
		input: Parameters<EstablishmentStore["registerLegalEstablishment"]>[0],
	) {
		const id = legalEstablishmentIdSchema.parse(this.#createId());
		const statusId = establishmentStatusHistoryIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const result: LegalEstablishment = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			establishmentType: input.establishmentType,
			jurisdictionCode: input.jurisdictionCode,
			registrationIdentifier: input.registrationIdentifier,
			normalizedRegistrationIdentifier: input.normalizedRegistrationIdentifier,
			displayName: input.displayName,
			currentStatus: "registered",
			registeredFrom: input.registeredFrom,
			createdAt: now,
			createdBy: input.recordedBy,
			updatedAt: now,
			updatedBy: input.recordedBy,
			version: 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_legal_establishment (id, organization_id, legal_company_id, establishment_type, jurisdiction_code, registration_identifier, normalized_registration_identifier, display_name, current_status, registered_from, created_by, updated_by, version, created_at, updated_at) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.establishmentType}, ${input.jurisdictionCode}, ${input.registrationIdentifier}, ${input.normalizedRegistrationIdentifier}, ${input.displayName}, 'registered', ${input.registeredFrom}, ${input.recordedBy}, ${input.recordedBy}, 1, ${now}, ${now})`;
			});
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_establishment_status_history (id, organization_id, legal_company_id, legal_establishment_id, status, effective_from, effective_to, recorded_at, recorded_by, reason, source_document_id, version) VALUES (${statusId}, ${input.organizationId}, ${input.legalCompanyId}, ${id}, 'registered', ${input.registeredFrom}, NULL, ${now}, ${input.recordedBy}, NULL, ${input.sourceDocumentId}, 1)`;
			});
			return errorResult.ok(result);
		}
		return this.#write(async () => {
			await this.#database.insert(caLegalEstablishment).values({
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				establishmentType: input.establishmentType,
				jurisdictionCode: input.jurisdictionCode,
				registrationIdentifier: input.registrationIdentifier,
				normalizedRegistrationIdentifier:
					input.normalizedRegistrationIdentifier,
				displayName: input.displayName,
				currentStatus: "registered",
				registeredFrom: input.registeredFrom,
				createdBy: input.recordedBy,
				updatedBy: input.recordedBy,
				version: 1,
				createdAt: now,
				updatedAt: now,
			});
			await this.#database.insert(caEstablishmentStatusHistory).values({
				id: statusId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				legalEstablishmentId: id,
				status: "registered",
				effectiveFrom: input.registeredFrom,
				recordedAt: now,
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
			});
			return result;
		});
	}

	async updateLegalEstablishment(
		input: Parameters<EstablishmentStore["updateLegalEstablishment"]>[0],
	) {
		const current = await this.getLegalEstablishment(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const updated = {
			...current.data,
			displayName: input.displayName,
			updatedAt: new Date(input.recordedAt),
			updatedBy: input.recordedBy,
			version: current.data.version + 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_legal_establishment SET display_name = ${input.displayName}, updated_at = ${updated.updatedAt}, updated_by = ${input.recordedBy}, version = version + 1 WHERE organization_id = ${input.organizationId} AND id = ${input.legalEstablishmentId} AND version = ${input.expectedVersion}`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caLegalEstablishment)
				.set({
					displayName: input.displayName,
					updatedAt: updated.updatedAt,
					updatedBy: input.recordedBy,
					version: updated.version,
				})
				.where(
					and(
						eq(caLegalEstablishment.organizationId, input.organizationId),
						eq(caLegalEstablishment.id, input.legalEstablishmentId),
						eq(caLegalEstablishment.version, input.expectedVersion),
					),
				);
			return updated;
		});
	}

	async transitionLegalEstablishment(
		input: Parameters<EstablishmentStore["transitionLegalEstablishment"]>[0],
	) {
		const current = await this.getLegalEstablishment(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const statusId = establishmentStatusHistoryIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const legalCompanyId = current.data.legalCompanyId;
		const updated: LegalEstablishment = {
			...current.data,
			currentStatus: input.status,
			updatedAt: now,
			updatedBy: input.recordedBy,
			version: current.data.version + 1,
		};
		if (input.transaction === undefined) {
			return errorResult.fail("SERVICE_UNAVAILABLE");
		}
		input.transaction.enqueue((database) => {
			const sql = asSql(database);
			return sql`UPDATE ca_establishment_status_history SET effective_to = ${input.effectiveFrom} WHERE organization_id = ${input.organizationId} AND legal_establishment_id = ${input.legalEstablishmentId} AND effective_to IS NULL`;
		});
		input.transaction.enqueue((database) => {
			const sql = asSql(database);
			return sql`INSERT INTO ca_establishment_status_history (id, organization_id, legal_company_id, legal_establishment_id, status, effective_from, recorded_at, recorded_by, reason, source_document_id, version) VALUES (${statusId}, ${input.organizationId}, ${legalCompanyId}, ${input.legalEstablishmentId}, ${input.status}, ${input.effectiveFrom}, ${now}, ${input.recordedBy}, ${input.reason}, ${input.sourceDocumentId}, ${updated.version})`;
		});
		input.transaction.enqueue((database) => {
			const sql = asSql(database);
			return sql`UPDATE ca_legal_establishment SET current_status = ${input.status}, updated_at = ${now}, updated_by = ${input.recordedBy}, version = version + 1 WHERE organization_id = ${input.organizationId} AND id = ${input.legalEstablishmentId} AND version = ${input.expectedVersion}`;
		});
		return errorResult.ok(updated);
	}

	async findRegisteredAddressAsOf(
		input: Parameters<EstablishmentStore["findRegisteredAddressAsOf"]>[0],
	) {
		const listed = await this.listRegisteredAddresses(input);
		if (!listed.ok) {
			return listed;
		}
		const row = listed.data
			.filter(
				(item) =>
					matchesEstablishmentAsOf(
						item.effectiveFrom,
						item.effectiveTo,
						input.asOf,
					) && visibleAtKnownTime(item.recordedAt, input.knownAt),
			)
			.sort(
				(left, right) =>
					right.effectiveFrom.localeCompare(left.effectiveFrom) ||
					right.recordedAt.getTime() - left.recordedAt.getTime(),
			)[0];
		return errorResult.ok(row ?? null);
	}

	async listRegisteredAddresses(
		input: Parameters<EstablishmentStore["listRegisteredAddresses"]>[0],
	) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caRegisteredAddress)
				.where(
					and(
						eq(caRegisteredAddress.organizationId, input.organizationId),
						eq(caRegisteredAddress.legalCompanyId, input.legalCompanyId),
						eq(
							caRegisteredAddress.addressScopeKey,
							input.legalEstablishmentId ?? input.legalCompanyId,
						),
						eq(caRegisteredAddress.addressType, input.addressType),
					),
				);
			return rows.map(mapRegisteredAddress);
		});
	}

	async setRegisteredAddress(
		input: Parameters<EstablishmentStore["setRegisteredAddress"]>[0],
	) {
		const id = registeredAddressIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: RegisteredAddress = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: input.legalEstablishmentId,
			addressType: input.addressType,
			address: input.address,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: 1,
		};
		const values = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: input.legalEstablishmentId,
			addressScopeKey: input.legalEstablishmentId ?? input.legalCompanyId,
			addressType: input.addressType,
			sourcePartyAddressId: input.address.sourcePartyAddressId,
			line1: input.address.line1,
			line2: input.address.line2,
			city: input.address.city,
			region: input.address.region,
			postalCode: input.address.postalCode,
			countryCode: input.address.countryCode,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			version: 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_registered_address (id, organization_id, legal_company_id, legal_establishment_id, address_scope_key, address_type, source_party_address_id, line_1, line_2, city, region, postal_code, country_code, effective_from, effective_to, recorded_at, recorded_by, source_document_id, version) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.legalEstablishmentId}, ${values.addressScopeKey}, ${input.addressType}, ${input.address.sourcePartyAddressId}, ${input.address.line1}, ${input.address.line2}, ${input.address.city}, ${input.address.region}, ${input.address.postalCode}, ${input.address.countryCode}, ${input.effectiveFrom}, ${input.effectiveTo}, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 1)`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caRegisteredAddress).values(values);
			return row;
		});
	}

	async getPremise(input: Parameters<EstablishmentStore["getPremise"]>[0]) {
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caPremise)
				.where(
					and(
						eq(caPremise.organizationId, input.organizationId),
						eq(caPremise.id, input.premiseId),
					),
				)
				.limit(1);
			return rows[0] === undefined ? null : mapPremise(rows[0]);
		});
	}

	async listPremisesAsOf(
		input: Parameters<EstablishmentStore["listPremisesAsOf"]>[0],
	) {
		const scope = premiseCursorScope(input);
		const cursor = decodePremiseCursor(input.pagination.cursor, scope);
		if (!cursor.ok) {
			return cursor;
		}
		return this.#read(async () => {
			const conditions = [
				eq(caPremise.organizationId, input.organizationId),
				eq(caPremise.legalCompanyId, input.legalCompanyId),
				querySql`${caPremise.effectiveFrom} <= ${input.asOf}`,
				querySql`(${caPremise.effectiveTo} IS NULL OR ${input.asOf} < ${caPremise.effectiveTo})`,
			];
			if (input.legalEstablishmentId !== undefined) {
				conditions.push(
					eq(caPremise.legalEstablishmentId, input.legalEstablishmentId),
				);
			}
			if (input.premiseType !== undefined) {
				conditions.push(eq(caPremise.premiseType, input.premiseType));
			}
			if (input.knownAt !== undefined) {
				conditions.push(querySql`${caPremise.recordedAt} <= ${input.knownAt}`);
			}
			if (cursor.data !== null) {
				conditions.push(querySql`(
					${caPremise.premiseType} > ${cursor.data[0]}
					OR (${caPremise.premiseType} = ${cursor.data[0]} AND ${caPremise.displayName} > ${cursor.data[1]})
					OR (${caPremise.premiseType} = ${cursor.data[0]} AND ${caPremise.displayName} = ${cursor.data[1]} AND ${caPremise.id} > ${cursor.data[2]})
				)`);
			}
			const rows = await this.#database
				.select()
				.from(caPremise)
				.where(and(...conditions))
				.orderBy(
					asc(caPremise.premiseType),
					asc(caPremise.displayName),
					asc(caPremise.id),
				)
				.limit(input.pagination.limit + 1);
			const pageRows = rows.slice(0, input.pagination.limit);
			const last = pageRows.at(-1);
			return {
				items: pageRows.map(mapPremise),
				nextCursor:
					rows.length > input.pagination.limit && last !== undefined
						? encodePremiseCursor(scope, [
								mapPremiseType(last.premiseType),
								last.displayName,
								premiseIdSchema.parse(last.id),
							])
						: null,
			};
		});
	}

	async registerPremise(
		input: Parameters<EstablishmentStore["registerPremise"]>[0],
	) {
		const id = premiseIdSchema.parse(this.#createId());
		const now = new Date(input.recordedAt);
		const row: Premise = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: input.legalEstablishmentId,
			premiseType: input.premiseType,
			displayName: input.displayName,
			address: input.address,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			status: "active",
			version: 1,
		};
		const values = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			legalEstablishmentId: input.legalEstablishmentId,
			premiseType: input.premiseType,
			displayName: input.displayName,
			sourcePartyAddressId: input.address.sourcePartyAddressId,
			line1: input.address.line1,
			line2: input.address.line2,
			city: input.address.city,
			region: input.address.region,
			postalCode: input.address.postalCode,
			countryCode: input.address.countryCode,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			recordedAt: now,
			recordedBy: input.recordedBy,
			sourceDocumentId: input.sourceDocumentId,
			status: "active",
			version: 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`INSERT INTO ca_premise (id, organization_id, legal_company_id, legal_establishment_id, premise_type, display_name, source_party_address_id, line_1, line_2, city, region, postal_code, country_code, effective_from, effective_to, recorded_at, recorded_by, source_document_id, status, version) VALUES (${id}, ${input.organizationId}, ${input.legalCompanyId}, ${input.legalEstablishmentId}, ${input.premiseType}, ${input.displayName}, ${input.address.sourcePartyAddressId}, ${input.address.line1}, ${input.address.line2}, ${input.address.city}, ${input.address.region}, ${input.address.postalCode}, ${input.address.countryCode}, ${input.effectiveFrom}, ${input.effectiveTo}, ${now}, ${input.recordedBy}, ${input.sourceDocumentId}, 'active', 1)`;
			});
			return errorResult.ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caPremise).values(values);
			return row;
		});
	}

	async endPremise(input: Parameters<EstablishmentStore["endPremise"]>[0]) {
		const current = await this.getPremise(input);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound();
		}
		if (current.data.version !== input.expectedVersion) {
			return stale(input.expectedVersion, current.data.version);
		}
		const updated: Premise = {
			...current.data,
			effectiveTo: input.endedOn,
			status: "ended",
			version: current.data.version + 1,
		};
		if (input.transaction !== undefined) {
			input.transaction.enqueue((database) => {
				const sql = asSql(database);
				return sql`UPDATE ca_premise SET effective_to = ${input.endedOn}, end_reason = ${input.reason}, status = 'ended', version = version + 1, updated_at = ${new Date(input.recordedAt)} WHERE organization_id = ${input.organizationId} AND id = ${input.premiseId} AND version = ${input.expectedVersion} AND status = 'active'`;
			});
			return errorResult.ok(updated);
		}
		return this.#write(async () => {
			await this.#database
				.update(caPremise)
				.set({
					effectiveTo: input.endedOn,
					endReason: input.reason,
					status: "ended",
					version: updated.version,
					updatedAt: new Date(input.recordedAt),
				})
				.where(
					and(
						eq(caPremise.organizationId, input.organizationId),
						eq(caPremise.id, input.premiseId),
						eq(caPremise.version, input.expectedVersion),
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

function mapEstablishment(
	row: typeof caLegalEstablishment.$inferSelect,
): LegalEstablishment {
	return {
		id: legalEstablishmentIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		establishmentType:
			row.establishmentType === "branch" ||
			row.establishmentType === "representative_office" ||
			row.establishmentType === "foreign_registration"
				? row.establishmentType
				: "other",
		jurisdictionCode: row.jurisdictionCode,
		registrationIdentifier: row.registrationIdentifier,
		normalizedRegistrationIdentifier: row.normalizedRegistrationIdentifier,
		displayName: row.displayName,
		currentStatus:
			row.currentStatus === "active" ||
			row.currentStatus === "suspended" ||
			row.currentStatus === "closed"
				? row.currentStatus
				: "registered",
		registeredFrom: canonicalDateSchema.parse(row.registeredFrom),
		createdAt: row.createdAt,
		createdBy: userIdSchema.parse(row.createdBy),
		updatedAt: row.updatedAt,
		updatedBy: userIdSchema.parse(row.updatedBy),
		version: row.version,
	};
}

function mapEstablishmentStatus(value: string | null) {
	return legalEstablishmentStatusSchema.parse(value);
}

function mapEstablishmentType(value: string) {
	return legalEstablishmentTypeSchema.parse(value);
}

function mapPremiseType(value: string) {
	return premiseTypeSchema.parse(value);
}

function mapStatusHistory(
	row: typeof caEstablishmentStatusHistory.$inferSelect,
): EstablishmentStatusHistory {
	return {
		id: establishmentStatusHistoryIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		legalEstablishmentId: legalEstablishmentIdSchema.parse(
			row.legalEstablishmentId,
		),
		status:
			row.status === "active" ||
			row.status === "suspended" ||
			row.status === "closed"
				? row.status
				: "registered",
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

function mapRegisteredAddress(
	row: typeof caRegisteredAddress.$inferSelect,
): RegisteredAddress {
	return {
		id: registeredAddressIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		legalEstablishmentId:
			row.legalEstablishmentId === null
				? null
				: legalEstablishmentIdSchema.parse(row.legalEstablishmentId),
		addressType:
			row.addressType === "service_address" ||
			row.addressType === "place_of_business"
				? row.addressType
				: "registered_office",
		address: {
			sourcePartyAddressId: row.sourcePartyAddressId,
			line1: row.line1,
			line2: row.line2,
			city: row.city,
			region: row.region,
			postalCode: row.postalCode,
			countryCode: row.countryCode,
		},
		effectiveFrom: canonicalDateSchema.parse(row.effectiveFrom),
		effectiveTo:
			row.effectiveTo === null
				? null
				: canonicalDateSchema.parse(row.effectiveTo),
		recordedAt: row.recordedAt,
		recordedBy: userIdSchema.parse(row.recordedBy),
		sourceDocumentId: row.sourceDocumentId,
		version: row.version,
	};
}

function mapPremise(row: typeof caPremise.$inferSelect): Premise {
	return {
		id: premiseIdSchema.parse(row.id),
		organizationId: organizationIdSchema.parse(row.organizationId),
		legalCompanyId: legalCompanyIdSchema.parse(row.legalCompanyId),
		legalEstablishmentId:
			row.legalEstablishmentId === null
				? null
				: legalEstablishmentIdSchema.parse(row.legalEstablishmentId),
		premiseType:
			row.premiseType === "office" ||
			row.premiseType === "warehouse" ||
			row.premiseType === "operational_site"
				? row.premiseType
				: "other",
		displayName: row.displayName,
		address: {
			sourcePartyAddressId: row.sourcePartyAddressId,
			line1: row.line1,
			line2: row.line2,
			city: row.city,
			region: row.region,
			postalCode: row.postalCode,
			countryCode: row.countryCode,
		},
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
