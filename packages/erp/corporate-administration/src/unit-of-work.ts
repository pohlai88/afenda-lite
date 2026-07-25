import type { CorporateAdministrationCompanyStore } from "./store/company-store";

export type CorporateAdministrationAggregateType =
	| "legal_company"
	| "company_name"
	| "company_identifier";

export interface CorporateAdministrationAuditFact {
	readonly organizationId: string;
	readonly actorUserId: string;
	readonly commandId: string;
	readonly aggregateType: CorporateAdministrationAggregateType;
	readonly aggregateId: string;
	readonly correlationId: string;
	readonly causationId: string | null;
	readonly action: string;
	readonly beforeVersion: number | null;
	readonly afterVersion: number | null;
	readonly changedFields: readonly string[];
	readonly occurredAt: string;
}

export interface CorporateAdministrationOutboxEvent {
	readonly id: string;
	readonly eventName: string;
	readonly eventVersion: 1;
	readonly organizationId: string;
	readonly legalCompanyId: string;
	readonly aggregateType: CorporateAdministrationAggregateType;
	readonly aggregateId: string;
	readonly aggregateVersion: number;
	readonly actorUserId: string;
	readonly correlationId: string;
	readonly causationId: string | null;
	readonly occurredAt: string;
	readonly payload: Readonly<Record<string, unknown>>;
}

export interface CorporateAdministrationAuditPort {
	append(fact: CorporateAdministrationAuditFact): Promise<void>;
}

export interface CorporateAdministrationOutboxPort {
	append(event: CorporateAdministrationOutboxEvent): Promise<void>;
}

export interface CorporateAdministrationUnitOfWorkContext {
	readonly store: CorporateAdministrationCompanyStore;
	readonly audit: CorporateAdministrationAuditPort;
	readonly outbox: CorporateAdministrationOutboxPort;
}

export interface CorporateAdministrationUnitOfWork {
	run<TResult>(
		operation: (
			context: CorporateAdministrationUnitOfWorkContext,
		) => Promise<TResult>,
	): Promise<TResult>;
}

export class CorporateAdministrationUnitOfWorkError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CorporateAdministrationUnitOfWorkError";
	}
}
