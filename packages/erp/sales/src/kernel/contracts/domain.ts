import type { ItemId, PartyId, PaymentTermId } from "@afenda/master-data";
import type {
	PriceBookEntryId,
	PriceBookId,
	ReturnAuthorizationId,
	ReturnAuthorizationLineId,
	SalesHoldId,
	SalesOrderId,
	SalesOrderLineId,
	SalesOrderScheduleId,
	SalesQuotationId,
	SalesQuotationLineId,
} from "../identity/brands";

export const PRICE_BOOK_STATUSES = [
	"draft",
	"active",
	"inactive",
	"archived",
] as const;
export type PriceBookStatus = (typeof PRICE_BOOK_STATUSES)[number];
export const QUOTATION_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"sent",
	"accepted",
	"expired",
	"rejected",
	"cancelled",
	"converted",
] as const;
export type SalesQuotationStatus = (typeof QUOTATION_STATUSES)[number];
export const SALES_ORDER_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"confirmed",
	"released",
	"partially_fulfilled",
	"fulfilled",
	"cancelled",
	"closed",
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];
export const SALES_HOLD_KINDS = [
	"credit",
	"availability",
	"pricing_margin",
	"compliance",
	"manual_review",
] as const;
export type SalesHoldKind = (typeof SALES_HOLD_KINDS)[number];
export const RETURN_AUTHORIZATION_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"rejected",
	"cancelled",
	"closed",
] as const;
export type ReturnAuthorizationStatus =
	(typeof RETURN_AUTHORIZATION_STATUSES)[number];

export interface AuditStamp {
	createdAt: Date;
	createdBy: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}
export interface PartySnapshot {
	billToAddress?: string | undefined;
	code: string;
	name: string;
	netDays?: number | undefined;
	partyId: PartyId;
	paymentTermCode?: string | undefined;
	paymentTermId?: PaymentTermId | undefined;
	paymentTermName?: string | undefined;
	shipToAddress?: string | undefined;
}
export interface ItemSnapshot {
	baseUomCode: string;
	baseUomId: string;
	code: string;
	itemId: ItemId;
	name: string;
}

export type PriceBook = AuditStamp & {
	id: PriceBookId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	currencyCode: string;
	validFrom: Date;
	validTo?: Date | undefined;
	priority: number;
	status: PriceBookStatus;
};
export type PriceBookEntry = AuditStamp & {
	id: PriceBookEntryId;
	organizationId: string;
	priceBookId: PriceBookId;
	itemId: ItemId;
	uomId: string;
	minimumQuantity: string;
	unitPrice: string;
	discountPercent: string;
	validFrom: Date;
	validTo?: Date | undefined;
};
export interface PriceCalculationTrace {
	baseUnitPrice: string;
	discountPercent: string;
	lineNetAmount: string;
	netUnitPrice: string;
	override?:
		| { unitPrice: string; reason: string; approvedBy: string }
		| undefined;
	priceBookEntryId: PriceBookEntryId;
	priceBookId: PriceBookId;
	quantity: string;
}

export type SalesQuotation = AuditStamp & {
	id: SalesQuotationId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	revision: number;
	status: SalesQuotationStatus;
	customer: PartySnapshot;
	currencyCode: string;
	validUntil: Date;
	subtotalAmount: string;
	discountTotal: string;
	taxTotal: string;
	documentTotal: string;
	convertedOrderId?: SalesOrderId | undefined;
};
export type SalesQuotationLine = AuditStamp & {
	id: SalesQuotationLineId;
	organizationId: string;
	quotationId: SalesQuotationId;
	lineNo: number;
	item: ItemSnapshot;
	quantity: string;
	unitPrice: string;
	discountAmount: string;
	taxAmount: string;
	lineAmount: string;
	pricingTrace?: PriceCalculationTrace | undefined;
};

export type SalesOrder = AuditStamp & {
	id: SalesOrderId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: SalesOrderStatus;
	customer: PartySnapshot;
	currencyCode: string;
	exchangeRate?: string | undefined;
	subtotalAmount: string;
	discountTotal: string;
	taxTotal: string;
	documentTotal: string;
	sourceQuotationId?: SalesQuotationId | undefined;
	confirmedAt?: Date | undefined;
	releasedAt?: Date | undefined;
	cancelledAt?: Date | undefined;
	closedAt?: Date | undefined;
};
export type SalesOrderLine = AuditStamp & {
	id: SalesOrderLineId;
	organizationId: string;
	orderId: SalesOrderId;
	lineNo: number;
	item: ItemSnapshot;
	quantity: string;
	fulfilledQuantity: string;
	unitPrice: string;
	discountAmount: string;
	taxAmount: string;
	lineAmount: string;
	pricingTrace?: PriceCalculationTrace | undefined;
};
export type SalesOrderSchedule = AuditStamp & {
	id: SalesOrderScheduleId;
	organizationId: string;
	orderId: SalesOrderId;
	orderLineId: SalesOrderLineId;
	requestedDate: Date;
	promisedDate?: Date | undefined;
	quantity: string;
	releasedQuantity: string;
	fulfilledQuantity: string;
};
export type SalesHold = AuditStamp & {
	id: SalesHoldId;
	organizationId: string;
	orderId: SalesOrderId;
	kind: SalesHoldKind;
	reason: string;
	status: "open" | "resolved";
	resolvedAt?: Date | undefined;
	resolvedBy?: string | undefined;
};

export type ReturnAuthorization = AuditStamp & {
	id: ReturnAuthorizationId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	orderId: SalesOrderId;
	status: ReturnAuthorizationStatus;
	reason: string;
};
export type ReturnAuthorizationLine = AuditStamp & {
	id: ReturnAuthorizationLineId;
	organizationId: string;
	returnAuthorizationId: ReturnAuthorizationId;
	orderLineId: SalesOrderLineId;
	quantity: string;
	reason: string;
	requestedDisposition: "refund" | "replacement" | "repair" | "reject";
};

export interface FulfillableSalesOrder {
	lines: SalesOrderLine[];
	order: SalesOrder;
	schedules: SalesOrderSchedule[];
}
