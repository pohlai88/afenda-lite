import type { Result } from "@afenda/errors/result";
import type { ItemId, PartyId, PaymentTermId } from "@afenda/master-data";
import type {
	PriceBookId,
	ReturnAuthorizationId,
	SalesHoldId,
	SalesOrderId,
	SalesOrderLineId,
	SalesQuotationId,
} from "./brands";
import type { SalesPage } from "./pagination";
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
} from "./types";

export type MasterDataSnapshotPort = {
	resolveCustomer(input: {
		organizationId: string;
		actorUserId: string;
		partyId: PartyId;
		paymentTermId?: PaymentTermId;
	}): Promise<
		Result<{
			partyId: PartyId;
			code: string;
			name: string;
			billToAddress?: string;
			shipToAddress?: string;
			paymentTermId?: PaymentTermId;
			paymentTermCode?: string;
			paymentTermName?: string;
			netDays?: number;
		}>
	>;
	resolveItem(input: {
		organizationId: string;
		actorUserId: string;
		itemId: ItemId;
		requestedUomId?: string;
	}): Promise<
		Result<{
			itemId: ItemId;
			code: string;
			name: string;
			baseUomId: string;
			baseUomCode: string;
		}>
	>;
};
export type TaxCalculationPort = {
	calculate(input: {
		organizationId: string;
		customerId: PartyId;
		currencyCode: string;
		lines: readonly { itemId: ItemId; quantity: string; netAmount: string }[];
	}): Promise<
		Result<{ totalTax: string; lineTaxes: string[]; jurisdiction?: string }>
	>;
};
export type CreditCheckPort = {
	check(input: {
		organizationId: string;
		customerId: PartyId;
		currencyCode: string;
		amount: string;
	}): Promise<
		Result<{ approved: boolean; reference: string; reason?: string }>
	>;
};
export type AvailabilityCheckPort = {
	check(input: {
		organizationId: string;
		lines: readonly { itemId: ItemId; quantity: string; requestedDate: Date }[];
	}): Promise<
		Result<{
			available: boolean;
			reference: string;
			shortages: readonly { itemId: ItemId; unavailableQuantity: string }[];
		}>
	>;
};
export type ClockPort = { now(): Date };

export type MutationEvidence = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
	eventType: string;
	entityType: string;
	entityId: string;
	code: string;
	version: number;
	action: "CREATE" | "UPDATE" | "DELETE";
};

export type SalesStore = {
	createPriceBook(
		input: Omit<PriceBook, keyof import("./types").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<PriceBook>>;
	addPriceBookEntry(
		input: Omit<PriceBookEntry, keyof import("./types").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<PriceBookEntry>>;
	updatePriceBookStatus(
		input: {
			organizationId: string;
			id: PriceBookId;
			expectedVersion: number;
			status: PriceBook["status"];
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<PriceBook>>;
	getPriceBook(input: {
		organizationId: string;
		id: PriceBookId;
	}): Promise<Result<PriceBook | null>>;
	listPriceBooks(input: {
		organizationId: string;
		cursor?: string;
		pageSize: number;
	}): Promise<Result<SalesPage<PriceBook>>>;
	findPriceEntries(input: {
		organizationId: string;
		itemId: ItemId;
		uomId: string;
		currencyCode: string;
		quantity: string;
		at: Date;
	}): Promise<Result<Array<{ book: PriceBook; entry: PriceBookEntry }>>>;
	createQuotation(
		input: Omit<SalesQuotation, keyof import("./types").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesQuotation>>;
	addQuotationLine(
		input: Omit<
			SalesQuotationLine,
			keyof import("./types").AuditStamp | "id" | "lineNo"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesQuotationLine>>;
	transitionQuotation(
		input: {
			organizationId: string;
			id: SalesQuotationId;
			expectedVersion: number;
			status: SalesQuotation["status"];
			actorUserId: string;
			convertedOrderId?: SalesOrderId;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesQuotation>>;
	getQuotation(input: {
		organizationId: string;
		id: SalesQuotationId;
	}): Promise<Result<SalesQuotation | null>>;
	listQuotationLines(input: {
		organizationId: string;
		quotationId: SalesQuotationId;
	}): Promise<Result<SalesQuotationLine[]>>;
	listQuotations(input: {
		organizationId: string;
		cursor?: string;
		pageSize: number;
	}): Promise<Result<SalesPage<SalesQuotation>>>;
	createOrder(
		input: Omit<SalesOrder, keyof import("./types").AuditStamp | "id"> & {
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesOrder>>;
	addOrderLine(
		input: Omit<
			SalesOrderLine,
			keyof import("./types").AuditStamp | "id" | "lineNo"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		schedule: { requestedDate: Date },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesOrderLine>>;
	transitionOrder(
		input: {
			organizationId: string;
			id: SalesOrderId;
			expectedVersion: number;
			status: SalesOrder["status"];
			actorUserId: string;
			at: Date;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesOrder>>;
	releaseOrder(
		input: {
			organizationId: string;
			id: SalesOrderId;
			expectedVersion: number;
			taxTotal: string;
			actorUserId: string;
			at: Date;
			creditReference?: string;
			availabilityReference?: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesOrder>>;
	getOrder(input: {
		organizationId: string;
		id: SalesOrderId;
	}): Promise<Result<SalesOrder | null>>;
	listOrders(input: {
		organizationId: string;
		cursor?: string;
		pageSize: number;
		status?: SalesOrder["status"];
	}): Promise<Result<SalesPage<SalesOrder>>>;
	listOrderLines(input: {
		organizationId: string;
		orderId: SalesOrderId;
	}): Promise<Result<SalesOrderLine[]>>;
	listOrderSchedules(input: {
		organizationId: string;
		orderId: SalesOrderId;
	}): Promise<Result<SalesOrderSchedule[]>>;
	placeHold(
		input: {
			organizationId: string;
			orderId: SalesOrderId;
			kind: SalesHoldKind;
			reason: string;
			actorUserId: string;
			idempotencyKey: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesHold>>;
	resolveHold(
		input: { organizationId: string; id: SalesHoldId; actorUserId: string },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesHold>>;
	listOpenHolds(input: {
		organizationId: string;
		orderId: SalesOrderId;
	}): Promise<Result<SalesHold[]>>;
	recordFulfillment(
		input: {
			organizationId: string;
			orderId: SalesOrderId;
			lineId: SalesOrderLineId;
			fulfilledQuantity: string;
			expectedVersion: number;
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<SalesOrder>>;
	createReturnAuthorization(
		input: Omit<
			ReturnAuthorization,
			keyof import("./types").AuditStamp | "id"
		> & { actorUserId: string; idempotencyKey: string },
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<ReturnAuthorization>>;
	addReturnLine(
		input: Omit<
			ReturnAuthorizationLine,
			keyof import("./types").AuditStamp | "id"
		> & {
			actorUserId: string;
			idempotencyKey: string;
			expectedVersion: number;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<ReturnAuthorizationLine>>;
	transitionReturn(
		input: {
			organizationId: string;
			id: ReturnAuthorizationId;
			expectedVersion: number;
			status: ReturnAuthorization["status"];
			actorUserId: string;
		},
		evidence: Omit<MutationEvidence, "entityId" | "version">,
	): Promise<Result<ReturnAuthorization>>;
	getReturnAuthorization(input: {
		organizationId: string;
		id: ReturnAuthorizationId;
	}): Promise<Result<ReturnAuthorization | null>>;
	listReturnAuthorizations(input: {
		organizationId: string;
		cursor?: string;
		pageSize: number;
	}): Promise<Result<SalesPage<ReturnAuthorization>>>;
	listReturnLines(input: {
		organizationId: string;
		returnAuthorizationId: ReturnAuthorizationId;
	}): Promise<Result<ReturnAuthorizationLine[]>>;
};
