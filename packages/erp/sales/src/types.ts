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
} from "./brands";

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

export type AuditStamp = {
	createdAt: Date;
	createdBy: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
};
export type PartySnapshot = {
	partyId: PartyId;
	code: string;
	name: string;
	billToAddress?: string;
	shipToAddress?: string;
	paymentTermId?: PaymentTermId;
	paymentTermCode?: string;
	paymentTermName?: string;
	netDays?: number;
};
export type ItemSnapshot = {
	itemId: ItemId;
	code: string;
	name: string;
	baseUomId: string;
	baseUomCode: string;
};

export type PriceBook = AuditStamp & {
	id: PriceBookId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	currencyCode: string;
	validFrom: Date;
	validTo?: Date;
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
	validTo?: Date;
};
export type PriceCalculationTrace = {
	priceBookId: PriceBookId;
	priceBookEntryId: PriceBookEntryId;
	baseUnitPrice: string;
	discountPercent: string;
	netUnitPrice: string;
	quantity: string;
	lineNetAmount: string;
	override?: { unitPrice: string; reason: string; approvedBy: string };
};

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
	convertedOrderId?: SalesOrderId;
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
	pricingTrace?: PriceCalculationTrace;
};

export type SalesOrder = AuditStamp & {
	id: SalesOrderId;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: SalesOrderStatus;
	customer: PartySnapshot;
	currencyCode: string;
	exchangeRate?: string;
	subtotalAmount: string;
	discountTotal: string;
	taxTotal: string;
	documentTotal: string;
	sourceQuotationId?: SalesQuotationId;
	confirmedAt?: Date;
	releasedAt?: Date;
	cancelledAt?: Date;
	closedAt?: Date;
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
	pricingTrace?: PriceCalculationTrace;
};
export type SalesOrderSchedule = AuditStamp & {
	id: SalesOrderScheduleId;
	organizationId: string;
	orderId: SalesOrderId;
	orderLineId: SalesOrderLineId;
	requestedDate: Date;
	promisedDate?: Date;
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
	resolvedAt?: Date;
	resolvedBy?: string;
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

export type FulfillableSalesOrder = {
	order: SalesOrder;
	lines: SalesOrderLine[];
	schedules: SalesOrderSchedule[];
};
