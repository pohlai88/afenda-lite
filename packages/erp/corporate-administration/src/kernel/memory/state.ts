import type {
	Establishment,
	EstablishmentStatusHistoryEntry,
} from "../contracts/domain";

/** Captured in place of a real `platform_audit_log` write (parity proof only). */
export interface MemoryAuditEntry {
	action: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	module: string;
	newValue: unknown;
	organizationId: string;
}

/** Captured in place of a real `platform_domain_event` write (parity proof only). */
export interface MemoryOutboxEvent {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: unknown;
	sourceModule: string;
	type: string;
}

/**
 * Shared in-memory domain state for the parity adapter.
 * Package-wide kernel primitive: as more features are added, their memory
 * slices operate on the same collections, so the state shape has one owner.
 */
export interface MemoryCorporateAdministrationState {
	auditEntries: MemoryAuditEntry[];
	establishmentStatusHistory: EstablishmentStatusHistoryEntry[];
	establishments: Establishment[];
	outboxEvents: MemoryOutboxEvent[];
}

export function createMemoryCorporateAdministrationState(): MemoryCorporateAdministrationState {
	return {
		establishments: [],
		establishmentStatusHistory: [],
		auditEntries: [],
		outboxEvents: [],
	};
}
