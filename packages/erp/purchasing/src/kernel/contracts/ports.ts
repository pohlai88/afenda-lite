import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors";
import type { PurchasingEventType } from "@afenda/events/schemas";
import type {
	Item,
	Party,
	PaymentTerm,
	RefUom,
	Warehouse,
} from "@afenda/master-data";

/** Same-TX audit fact — production adapter writes `platform_audit_log`. */
export interface AuditFactInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
}

export interface AuditFactPort {
	record: (input: AuditFactInput) => Promise<Result<{ id: string }>>;
}

export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: PurchasingEventType;
}

export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}

export interface MutationPorts {
	audit: AuditFactPort;
	outbox: OutboxPort;
}

/**
 * Downstream commitment snapshot for close — adapters live in apps/web.
 * Package must NOT import receiving/payables.
 */
export interface PurchaseOrderCommitmentStatus {
	hasPostedReceipt: boolean;
	hasPostedSupplierInvoice: boolean;
	invoicedQuantity: string;
	orderedQuantity: string;
	receivedQuantity: string;
}

export interface PurchaseOrderCommitmentQueryPort {
	getCommitmentStatus: (input: {
		organizationId: string;
		purchaseOrderId: string;
	}) => Promise<Result<PurchaseOrderCommitmentStatus>>;
}

/** Resolve Authority B masters — never dual-write `md_*`. */
export interface MasterLookupPort {
	getItemById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<Item | null>>;
	getPartyById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<Party | null>>;
	getPaymentTermById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<PaymentTerm | null>>;
	getRefUomById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<RefUom | null>>;
	getWarehouseById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<Warehouse | null>>;
	hasActiveSupplierRole: (
		organizationId: string,
		partyId: string,
		actorUserId: string,
	) => Promise<Result<boolean>>;
}
