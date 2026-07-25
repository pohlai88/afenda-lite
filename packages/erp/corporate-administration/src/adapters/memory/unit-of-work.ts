import { fail, type Result } from "@afenda/errors/result";

import type { MemoryCorporateAdministrationStore } from "../../memory-store";
import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompany,
} from "../../company/types";
import type {
	CorporateAdministrationAuditFact,
	CorporateAdministrationAuditPort,
	CorporateAdministrationOutboxEvent,
	CorporateAdministrationOutboxPort,
	CorporateAdministrationUnitOfWork,
	CorporateAdministrationUnitOfWorkContext,
} from "../../unit-of-work";
import { CorporateAdministrationUnitOfWorkError } from "../../unit-of-work";
import {
	isCorporateAdministrationStoreError,
	mapCorporateAdministrationStoreError,
} from "../../store/store-errors";

export type MemoryUnitOfWorkOptions = {
	readonly failAudit?: boolean;
	readonly failOutbox?: boolean;
	readonly auditRecords?: CorporateAdministrationAuditFact[];
	readonly outboxRecords?: CorporateAdministrationOutboxEvent[];
};

type MemoryCompanyStoreMaps = {
	companies: Map<string, CaLegalCompany>;
	names: Map<string, CaCompanyName>;
	identifiers: Map<string, CaCompanyIdentifier>;
	statusHistory: Map<string, CaCompanyStatusHistory>;
};

type MemoryCompanyStoreSnapshot = {
	readonly companies: ReadonlyMap<string, CaLegalCompany>;
	readonly names: ReadonlyMap<string, CaCompanyName>;
	readonly identifiers: ReadonlyMap<string, CaCompanyIdentifier>;
	readonly statusHistory: ReadonlyMap<string, CaCompanyStatusHistory>;
};

function getMemoryCompanyStoreMaps(
	store: MemoryCorporateAdministrationStore,
): MemoryCompanyStoreMaps {
	return store as unknown as MemoryCompanyStoreMaps;
}

function snapshotMemoryCompanyStore(
	store: MemoryCorporateAdministrationStore,
): MemoryCompanyStoreSnapshot {
	const maps = getMemoryCompanyStoreMaps(store);
	return {
		companies: new Map(maps.companies),
		names: new Map(maps.names),
		identifiers: new Map(maps.identifiers),
		statusHistory: new Map(maps.statusHistory),
	};
}

function restoreMap<TKey, TValue>(
	target: Map<TKey, TValue>,
	source: ReadonlyMap<TKey, TValue>,
): void {
	target.clear();
	for (const [key, value] of source) {
		target.set(key, structuredClone(value));
	}
}

function restoreMemoryCompanyStore(
	store: MemoryCorporateAdministrationStore,
	snapshot: MemoryCompanyStoreSnapshot,
): void {
	const maps = getMemoryCompanyStoreMaps(store);
	restoreMap(maps.companies, snapshot.companies);
	restoreMap(maps.names, snapshot.names);
	restoreMap(maps.identifiers, snapshot.identifiers);
	restoreMap(maps.statusHistory, snapshot.statusHistory);
}

export function createMemoryCorporateAdministrationUnitOfWork(
	store: MemoryCorporateAdministrationStore,
	options: MemoryUnitOfWorkOptions = {},
): CorporateAdministrationUnitOfWork {
	return {
		async run<TResult>(
			operation: (
				context: CorporateAdministrationUnitOfWorkContext,
			) => Promise<TResult>,
		): Promise<TResult> {
			const snapshot = snapshotMemoryCompanyStore(store);
			const auditBuffer: CorporateAdministrationAuditFact[] = [];
			const outboxBuffer: CorporateAdministrationOutboxEvent[] = [];

			const audit: CorporateAdministrationAuditPort = {
				async append(fact) {
					if (options.failAudit) {
						throw new CorporateAdministrationUnitOfWorkError(
							"Injected audit failure",
						);
					}
					auditBuffer.push(fact);
				},
			};

			const outbox: CorporateAdministrationOutboxPort = {
				async append(event) {
					if (options.failOutbox) {
						throw new CorporateAdministrationUnitOfWorkError(
							"Injected outbox failure",
						);
					}
					outboxBuffer.push(event);
				},
			};

			const context: CorporateAdministrationUnitOfWorkContext = {
				store,
				audit,
				outbox,
			};

			try {
				const result = await operation(context);
				options.auditRecords?.push(...auditBuffer);
				options.outboxRecords?.push(...outboxBuffer);
				return result;
			} catch (error) {
				restoreMemoryCompanyStore(store, snapshot);
				if (error instanceof CorporateAdministrationUnitOfWorkError) {
					return fail(
						"INTERNAL_ERROR",
						error.message,
					) as TResult;
				}
				if (isCorporateAdministrationStoreError(error)) {
					return mapCorporateAdministrationStoreError(error) as TResult;
				}
				throw error;
			}
		},
	};
}
