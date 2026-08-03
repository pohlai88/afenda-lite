import type { Result } from "@afenda/errors";
import type { ItemId, PartyId, PaymentTermId } from "@afenda/master-data";
import type {
	PriceBookId,
	ReturnAuthorizationId,
	SalesHoldId,
	SalesOrderId,
	SalesOrderLineId,
	SalesQuotationId,
} from "../identity/brands";
import type { SalesPage } from "../validation/pagination";
import type {
	PriceBook,
	PriceBookEntry,
	ReturnAuthorization,
	ReturnAuthorizationLine,
	SalesHold,
	SalesHoldKind,
	SalesOrder,
	SalesOrderLine,
	SalesOrderSchedule,
	SalesQuotation,
	SalesQuotationLine,
} from "./domain";

export interface MasterDataSnapshotPort {
	resolveCustomer: (input: {
		organizationId: string;
		actorUserId: string;
		partyId: PartyId;
		paymentTermId?: PaymentTermId | undefined;
	}) => Promise<
		Result<{
			partyId: PartyId;
			code: string;
			name: string;
			billToAddress?: string | undefined;
			shipToAddress?: string | undefined;
			paymentTermId?: PaymentTermId | undefined;
			paymentTermCode?: string | undefined;
			paymentTermName?: string | undefined;
			netDays?: number | undefined;
		}>
	>;
	resolveItem: (input: {
		organizationId: string;
		actorUserId: string;
		itemId: ItemId;
		requestedUomId?: string | undefined;
	}) => Promise<
		Result<{
			itemId: ItemId;
			code: string;
			name: string;
			baseUomId: string;
			baseUomCode: string;
		}>
	>;
}
export interface TaxCalculationPort {
	calculate: (input: {
		organizationId: string;
		customerId: PartyId;
		currencyCode: string;
		lines: readonly { itemId: ItemId; quantity: string; netAmount: string }[];
	}) => Promise<
		Result<{ totalTax: string; lineTaxes: string[]; jurisdiction?: string }>
	>;
}
export interface CreditCheckPort {
	check: (input: {
		organizationId: string;
		customerId: PartyId;
		currencyCode: string;
		amount: string;
	}) => Promise<
		Result<{ approved: boolean; reference: string; reason?: string }>
	>;
}
export interface AvailabilityCheckPort {
	check: (input: {
		organizationId: string;
		lines: readonly { itemId: ItemId; quantity: string; requestedDate: Date }[];
	}) => Promise<
		Result<{
			available: boolean;
			reference: string;
			shortages: readonly { itemId: ItemId; unavailableQuantity: string }[];
		}>
	>;
}
export interface ClockPort {
	now: () => Date;
}

export interface MutationEvidence {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	code: string;
	correlationId: string;
	entityId: string;
	entityType: string;
	eventType: string;
	idempotencyKey: string;
	organizationId: string;
	version: number;
}

export interface SalesStore {
	addOrderLine: (
		input: Omit<
			SalesOrderLine,
			keyof import("./domain").AuditStamp | "id" | "lineNo"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		schedule: { requestedDate: Date },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesOrderLine>>;
	addPriceBookEntry: (
		input: Omit<PriceBookEntry, keyof import("./domain").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<PriceBookEntry>>;
	addQuotationLine: (
		input: Omit<
			SalesQuotationLine,
			keyof import("./domain").AuditStamp | "id" | "lineNo"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesQuotationLine>>;
	addReturnLine: (
		input: Omit<
			ReturnAuthorizationLine,
			keyof import("./domain").AuditStamp | "id"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<ReturnAuthorizationLine>>;
	createOrder: (
		input: Omit<SalesOrder, keyof import("./domain").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesOrder>>;
	createPriceBook: (
		input: Omit<PriceBook, keyof import("./domain").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<PriceBook>>;
	createQuotation: (
		input: Omit<SalesQuotation, keyof import("./domain").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesQuotation>>;
	createReturnAuthorization: (
		input: Omit<
			ReturnAuthorization,
			keyof import("./domain").AuditStamp | "id"
		> & { actorUserId: string; idempotencyKey: string },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<ReturnAuthorization>>;
	findPriceEntries: (input: {
		organizationId: string;
		itemId: ItemId;
		uomId: string;
		currencyCode: string;
		quantity: string;
		at: Date;
	}) => Promise<Result<Array<{ book: PriceBook; entry: PriceBookEntry }>>>;
	getOrder: (input: {
		organizationId: string;
		id: SalesOrderId;
	}) => Promise<Result<SalesOrder | null>>;
	getPriceBook: (input: {
		organizationId: string;
		id: PriceBookId;
	}) => Promise<Result<PriceBook | null>>;
	getQuotation: (input: {
		organizationId: string;
		id: SalesQuotationId;
	}) => Promise<Result<SalesQuotation | null>>;
	getReturnAuthorization: (input: {
		organizationId: string;
		id: ReturnAuthorizationId;
	}) => Promise<Result<ReturnAuthorization | null>>;
	listOpenHolds: (input: {
		organizationId: string;
		orderId: SalesOrderId;
	}) => Promise<Result<SalesHold[]>>;
	listOrderLines: (input: {
		organizationId: string;
		orderId: SalesOrderId;
	}) => Promise<Result<SalesOrderLine[]>>;
	listOrderSchedules: (input: {
		organizationId: string;
		orderId: SalesOrderId;
	}) => Promise<Result<SalesOrderSchedule[]>>;
	listOrders: (input: {
		organizationId: string;
		cursor?: string | undefined;
		pageSize: number;
		status?: SalesOrder["status"] | undefined;
	}) => Promise<Result<SalesPage<SalesOrder>>>;
	listPriceBooks: (input: {
		organizationId: string;
		cursor?: string | undefined;
		pageSize: number;
	}) => Promise<Result<SalesPage<PriceBook>>>;
	listQuotationLines: (input: {
		organizationId: string;
		quotationId: SalesQuotationId;
	}) => Promise<Result<SalesQuotationLine[]>>;
	listQuotations: (input: {
		organizationId: string;
		cursor?: string | undefined;
		pageSize: number;
	}) => Promise<Result<SalesPage<SalesQuotation>>>;
	listReturnAuthorizations: (input: {
		organizationId: string;
		cursor?: string | undefined;
		pageSize: number;
	}) => Promise<Result<SalesPage<ReturnAuthorization>>>;
	listReturnLines: (input: {
		organizationId: string;
		returnAuthorizationId: ReturnAuthorizationId;
	}) => Promise<Result<ReturnAuthorizationLine[]>>;
	placeHold: (
		input: {
			organizationId: string;
			orderId: SalesOrderId;
			kind: SalesHoldKind;
			reason: string;
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesHold>>;
	recordFulfillment: (
		input: {
			organizationId: string;
			orderId: SalesOrderId;
			lineId: SalesOrderLineId;
			fulfilledQuantity: string;
			expectedVersion: number;
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesOrder>>;
	releaseOrder: (
		input: {
			organizationId: string;
			id: SalesOrderId;
			expectedVersion: number;
			taxTotal: string;
			actorUserId: string;
			at: Date;
			creditReference?: string | undefined;
			availabilityReference?: string | undefined;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesOrder>>;
	resolveHold: (
		input: { organizationId: string; id: SalesHoldId; actorUserId: string },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesHold>>;
	transitionOrder: (
		input: {
			organizationId: string;
			id: SalesOrderId;
			expectedVersion: number;
			status: SalesOrder["status"];
			actorUserId: string;
			at: Date;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesOrder>>;
	transitionQuotation: (
		input: {
			organizationId: string;
			id: SalesQuotationId;
			expectedVersion: number;
			status: SalesQuotation["status"];
			actorUserId: string;
			convertedOrderId?: SalesOrderId | undefined;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<SalesQuotation>>;
	transitionReturn: (
		input: {
			organizationId: string;
			id: ReturnAuthorizationId;
			expectedVersion: number;
			status: ReturnAuthorization["status"];
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<ReturnAuthorization>>;
	updatePriceBookStatus: (
		input: {
			organizationId: string;
			id: PriceBookId;
			expectedVersion: number;
			status: PriceBook["status"];
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	) => Promise<Result<PriceBook>>;
}
