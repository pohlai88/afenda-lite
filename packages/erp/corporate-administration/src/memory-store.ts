import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import type {
	CA_COMPANY_CREATED_EVENT,
	CorporateAdministrationEventType,
} from "@afenda/events/schemas";

import {
	CA_ERROR_CODE_CONFLICT,
	CA_ERROR_COMPANY_NOT_FOUND,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "./error-codes";
import type {
	CorporateAdministrationStore,
	LegalCompanyCreateRecord,
	MutationPorts,
} from "./ports";
import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompany,
	CaLegalCompanyDetail,
} from "./schemas";
import { MemorySlicesStore } from "./slices-memory-store";

function cloneCompany(company: CaLegalCompany): CaLegalCompany {
	return structuredClone(company);
}

export class MemoryCorporateAdministrationStore
	extends MemorySlicesStore
	implements CorporateAdministrationStore
{
	private readonly companies = new Map<string, CaLegalCompany>();
	private readonly names = new Map<string, CaCompanyName>();
	private readonly identifiers = new Map<string, CaCompanyIdentifier>();
	private readonly statusHistory = new Map<string, CaCompanyStatusHistory>();

	async getByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaLegalCompany | null>> {
		for (const company of this.companies.values()) {
			if (
				company.organizationId === organizationId &&
				company.createIdempotencyKey === idempotencyKey
			) {
				return ok(cloneCompany(company));
			}
		}
		return ok(null);
	}

	async getById(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>> {
		const company = this.companies.get(legalCompanyId);
		if (!company || company.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneCompany(company));
	}

	async list(
		organizationId: string,
		filter: {
			status?: CaLegalCompany["status"];
			page: number;
			pageSize: number;
		},
	): Promise<Result<{ items: CaLegalCompany[]; total: number }>> {
		const items = [...this.companies.values()]
			.filter(
				(company) =>
					company.organizationId === organizationId &&
					(filter.status === undefined || company.status === filter.status),
			)
			.sort((a, b) => a.code.localeCompare(b.code));
		const start = (filter.page - 1) * filter.pageSize;
		return ok({
			items: items.slice(start, start + filter.pageSize).map(cloneCompany),
			total: items.length,
		});
	}

	async getDetail(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompanyDetail | null>> {
		const companyResult = await this.getById(organizationId, legalCompanyId);
		if (!companyResult.ok) return companyResult;
		if (companyResult.data === null) return ok(null);
		const names = await this.listNames(organizationId, legalCompanyId);
		if (!names.ok) return names;
		const identifiers = await this.listIdentifiers(
			organizationId,
			legalCompanyId,
		);
		if (!identifiers.ok) return identifiers;
		const history = await this.listStatusHistory(
			organizationId,
			legalCompanyId,
		);
		if (!history.ok) return history;
		return ok({
			...companyResult.data,
			names: names.data,
			identifiers: identifiers.data,
			statusHistory: history.data,
		});
	}

	async createCompany(
		record: LegalCompanyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventType: typeof CA_COMPANY_CREATED_EVENT },
	): Promise<Result<CaLegalCompany>> {
		for (const existing of this.companies.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.createIdempotencyKey === record.createIdempotencyKey
			) {
				if (
					existing.createRequestFingerprint !== record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key was already used for a different request",
						caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
					);
				}
				return ok(cloneCompany(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					"Company code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.legalEntityDimensionId === record.legalEntityDimensionId
			) {
				return fail(
					"CONFLICT",
					"Legal entity dimension already bound",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const company: CaLegalCompany = {
			id: randomUUID(),
			...record,
			version: 1,
			activatedAt: null,
			activatedBy: null,
			suspendedAt: null,
			suspendedBy: null,
			dissolvedAt: null,
			dissolvedBy: null,
			archivedAt: null,
			archivedBy: null,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await ports.record({
			audit: {
				organizationId: company.organizationId,
				actorUserId: company.createdBy,
				correlationId: meta.correlationId,
				entity: "legal_company",
				entityId: company.id,
				action: "CREATE",
				changes: [],
				newValue: company as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: company.organizationId,
				actorUserId: company.createdBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: company.organizationId,
					entityType: "legal_company",
					entityId: company.id,
					code: company.code,
					version: company.version,
					actorId: company.createdBy,
					correlationId: meta.correlationId,
					status: company.status,
				},
			},
		});
		if (!facts.ok) return facts;
		this.companies.set(company.id, company);
		return ok(cloneCompany(company));
	}

	async updateCompany(
		record: CaLegalCompany,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			statusHistory?: Omit<CaCompanyStatusHistory, "id" | "createdAt">;
		},
	): Promise<Result<CaLegalCompany>> {
		const existing = this.companies.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Legal company not found",
				caErrorDetails(CA_ERROR_COMPANY_NOT_FOUND),
			);
		}
		if (existing.version !== record.version) {
			return fail(
				"CONFLICT",
				"Legal company version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaLegalCompany = {
			...record,
			version: record.version + 1,
			updatedAt: new Date(),
		};
		const facts = await ports.record({
			audit: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "legal_company",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
				oldValue: existing as unknown as Record<string, unknown>,
				newValue: updated as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: updated.organizationId,
					entityType: "legal_company",
					entityId: updated.id,
					code: updated.code,
					version: updated.version,
					actorId: updated.updatedBy,
					correlationId: meta.correlationId,
					status: updated.status,
				},
			},
		});
		if (!facts.ok) return facts;
		this.companies.set(updated.id, updated);
		if (meta.statusHistory) {
			const history: CaCompanyStatusHistory = {
				id: randomUUID(),
				...meta.statusHistory,
				createdAt: new Date(),
			};
			this.statusHistory.set(history.id, history);
		}
		return ok(cloneCompany(updated));
	}

	async getStatusHistoryByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyStatusHistory | null>> {
		for (const row of this.statusHistory.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(structuredClone(row));
			}
		}
		return ok(null);
	}

	async getNameByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyName | null>> {
		for (const row of this.names.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(structuredClone(row));
			}
		}
		return ok(null);
	}

	async getIdentifierByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyIdentifier | null>> {
		for (const row of this.identifiers.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(structuredClone(row));
			}
		}
		return ok(null);
	}

	async appendStatusHistory(
		record: Omit<CaCompanyStatusHistory, "id" | "createdAt">,
	): Promise<Result<CaCompanyStatusHistory>> {
		const row: CaCompanyStatusHistory = {
			id: randomUUID(),
			...record,
			createdAt: new Date(),
		};
		this.statusHistory.set(row.id, row);
		return ok(row);
	}

	async addName(
		record: Omit<CaCompanyName, "id" | "version" | "createdAt" | "updatedAt">,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyName>> {
		const now = new Date();
		const row: CaCompanyName = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await ports.record({
			audit: {
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				correlationId: meta.correlationId,
				entity: "company_name",
				entityId: row.id,
				action: "CREATE",
				changes: [],
				newValue: row as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: row.organizationId,
					entityType: "legal_company",
					entityId: row.legalCompanyId,
					code: meta.legalCompanyCode,
					version: row.version,
					actorId: row.createdBy,
					correlationId: meta.correlationId,
					status: "draft",
				},
			},
		});
		if (!facts.ok) return facts;
		this.names.set(row.id, row);
		return ok(structuredClone(row));
	}

	async listNames(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyName[]>> {
		return ok(
			[...this.names.values()].filter(
				(row) =>
					row.organizationId === organizationId &&
					row.legalCompanyId === legalCompanyId,
			),
		);
	}

	async addIdentifier(
		record: Omit<
			CaCompanyIdentifier,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyIdentifier>> {
		for (const existing of this.identifiers.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.identifierType === record.identifierType &&
				existing.normalizedValue === record.normalizedValue
			) {
				return fail(
					"CONFLICT",
					"Identifier already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaCompanyIdentifier = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await ports.record({
			audit: {
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				correlationId: meta.correlationId,
				entity: "company_identifier",
				entityId: row.id,
				action: "CREATE",
				changes: [],
				newValue: row as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: row.organizationId,
					entityType: "legal_company",
					entityId: row.legalCompanyId,
					code: meta.legalCompanyCode,
					version: row.version,
					actorId: row.createdBy,
					correlationId: meta.correlationId,
					status: "draft",
				},
			},
		});
		if (!facts.ok) return facts;
		this.identifiers.set(row.id, row);
		return ok(structuredClone(row));
	}

	async listIdentifiers(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyIdentifier[]>> {
		return ok(
			[...this.identifiers.values()].filter(
				(row) =>
					row.organizationId === organizationId &&
					row.legalCompanyId === legalCompanyId,
			),
		);
	}

	async listStatusHistory(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyStatusHistory[]>> {
		return ok(
			[...this.statusHistory.values()]
				.filter(
					(row) =>
						row.organizationId === organizationId &&
						row.legalCompanyId === legalCompanyId,
				)
				.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
		);
	}

	async getNameById(
		organizationId: string,
		companyNameId: string,
	): Promise<Result<CaCompanyName | null>> {
		const row = this.names.get(companyNameId);
		if (!row || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(structuredClone(row));
	}

	async getIdentifierById(
		organizationId: string,
		companyIdentifierId: string,
	): Promise<Result<CaCompanyIdentifier | null>> {
		const row = this.identifiers.get(companyIdentifierId);
		if (!row || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(structuredClone(row));
	}

	async endName(
		record: CaCompanyName,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyName>> {
		const existing = this.names.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Company name not found");
		}
		if (existing.version !== record.version) {
			return fail(
				"CONFLICT",
				"Company name version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaCompanyName = {
			...record,
			version: record.version + 1,
			updatedAt: new Date(),
		};
		const facts = await ports.record({
			audit: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "company_name",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
				oldValue: existing as unknown as Record<string, unknown>,
				newValue: updated as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: updated.organizationId,
					entityType: "legal_company",
					entityId: updated.legalCompanyId,
					code: meta.legalCompanyCode,
					version: updated.version,
					actorId: updated.updatedBy,
					correlationId: meta.correlationId,
					status: "draft",
				},
			},
		});
		if (!facts.ok) return facts;
		this.names.set(updated.id, updated);
		return ok(structuredClone(updated));
	}

	async updateIdentifier(
		record: CaCompanyIdentifier,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyIdentifier>> {
		const existing = this.identifiers.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Company identifier not found");
		}
		if (existing.version !== record.version) {
			return fail(
				"CONFLICT",
				"Company identifier version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaCompanyIdentifier = {
			...record,
			version: record.version + 1,
			updatedAt: new Date(),
		};
		const facts = await ports.record({
			audit: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				entity: "company_identifier",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
				oldValue: existing as unknown as Record<string, unknown>,
				newValue: updated as unknown as Record<string, unknown>,
			},
			outbox: {
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				correlationId: meta.correlationId,
				type: meta.eventType,
				payload: {
					organizationId: updated.organizationId,
					entityType: "legal_company",
					entityId: updated.legalCompanyId,
					code: meta.legalCompanyCode,
					version: updated.version,
					actorId: updated.updatedBy,
					correlationId: meta.correlationId,
					status: "draft",
				},
			},
		});
		if (!facts.ok) return facts;
		this.identifiers.set(updated.id, updated);
		return ok(structuredClone(updated));
	}
}

export function createMemoryCorporateAdministrationStore(): MemoryCorporateAdministrationStore {
	return new MemoryCorporateAdministrationStore();
}
