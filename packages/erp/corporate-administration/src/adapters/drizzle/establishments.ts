import {
	and,
	asc,
	caEstablishmentStatusHistory,
	caLegalEstablishment,
	caPremise,
	caRegisteredAddress,
	eq,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import {
	matchesEstablishmentAsOf,
	resolveEstablishmentStatusAsOf,
	visibleAtKnownTime,
} from "../../establishments/rules";
import type { EstablishmentStore } from "../../establishments/store";
import type {
	EstablishmentStatusHistory,
	LegalEstablishment,
	Premise,
	RegisteredAddress,
} from "../../establishments/types";
import {
	establishmentStatusHistoryIdSchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
	premiseIdSchema,
	registeredAddressIdSchema,
	userIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

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
		return this.#read(async () => {
			const roots = await this.#database
				.select()
				.from(caLegalEstablishment)
				.where(
					and(
						eq(caLegalEstablishment.organizationId, input.organizationId),
						eq(caLegalEstablishment.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(
					asc(caLegalEstablishment.establishmentType),
					asc(caLegalEstablishment.jurisdictionCode),
					asc(caLegalEstablishment.normalizedRegistrationIdentifier),
				);
			const historyRows = await this.#database
				.select()
				.from(caEstablishmentStatusHistory)
				.where(
					and(
						eq(
							caEstablishmentStatusHistory.organizationId,
							input.organizationId,
						),
						eq(
							caEstablishmentStatusHistory.legalCompanyId,
							input.legalCompanyId,
						),
					),
				);
			const history = historyRows.map(mapStatusHistory);
			return roots
				.map(mapEstablishment)
				.filter((root) => root.registeredFrom <= input.asOf)
				.map((root) => {
					const status = resolveEstablishmentStatusAsOf({
						history: history.filter(
							(row) => row.legalEstablishmentId === root.id,
						),
						asOf: input.asOf,
						knownAt: input.knownAt,
					});
					return status === null
						? null
						: { ...root, currentStatus: status.status };
				})
				.filter((row): row is LegalEstablishment => row !== null)
				.filter(
					(row) =>
						input.status === undefined || row.currentStatus === input.status,
				);
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
			return ok(result);
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
		if (!current.ok) return current;
		if (current.data === null) return notFound();
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
			return ok(updated);
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
		if (!current.ok) return current;
		if (current.data === null) return notFound();
		if (current.data.version !== input.expectedVersion)
			return stale(input.expectedVersion, current.data.version);
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
			return fail(
				"SERVICE_UNAVAILABLE",
				"Corporate Administration status transitions require a transaction.",
				corporateAdministrationErrorDetails(
					"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
					{ field: "transaction" },
				),
			);
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
		return ok(updated);
	}

	async findRegisteredAddressAsOf(
		input: Parameters<EstablishmentStore["findRegisteredAddressAsOf"]>[0],
	) {
		const listed = await this.listRegisteredAddresses(input);
		if (!listed.ok) return listed;
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
		return ok(row ?? null);
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
			return ok(row);
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
		return this.#read(async () => {
			const rows = await this.#database
				.select()
				.from(caPremise)
				.where(
					and(
						eq(caPremise.organizationId, input.organizationId),
						eq(caPremise.legalCompanyId, input.legalCompanyId),
					),
				)
				.orderBy(asc(caPremise.premiseType), asc(caPremise.displayName));
			return rows
				.map(mapPremise)
				.filter(
					(row) =>
						(input.legalEstablishmentId === undefined ||
							row.legalEstablishmentId === input.legalEstablishmentId) &&
						(input.premiseType === undefined ||
							row.premiseType === input.premiseType) &&
						matchesEstablishmentAsOf(
							row.effectiveFrom,
							row.effectiveTo,
							input.asOf,
						) &&
						visibleAtKnownTime(row.recordedAt, input.knownAt),
				);
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
			return ok(row);
		}
		return this.#write(async () => {
			await this.#database.insert(caPremise).values(values);
			return row;
		});
	}

	async endPremise(input: Parameters<EstablishmentStore["endPremise"]>[0]) {
		const current = await this.getPremise(input);
		if (!current.ok) return current;
		if (current.data === null) return notFound();
		if (current.data.version !== input.expectedVersion)
			return stale(input.expectedVersion, current.data.version);
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
			return ok(updated);
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
			return ok(await work());
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
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
	return fail(
		"NOT_FOUND",
		"Corporate Administration record was not found.",
		corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_NOT_FOUND"),
	);
}
function stale(expectedVersion: number, actualVersion: number): Result<never> {
	return fail(
		"CONFLICT",
		"Corporate Administration record version is stale.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_STALE_VERSION",
			{ expectedVersion, actualVersion },
		),
	);
}
