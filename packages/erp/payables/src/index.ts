import "server-only";

export type { DrizzlePayablesStore } from "./composition/adapters/drizzle";
export { createDrizzlePayablesStore } from "./composition/adapters/drizzle";
export type { PayablesStore } from "./composition/store/contract";
export {
	addSupplierCreditNoteLine,
	addSupplierInvoiceLine,
	applySupplierCredit,
	applySupplierPayment,
	cancelSupplierInvoice,
	createDraftSupplierCreditNote,
	createDraftSupplierInvoice,
	getSupplierBalance,
	getSupplierInvoiceById,
	issueSupplierCreditNote,
	listSupplierInvoices,
	matchSupplierInvoice,
	postSupplierCreditNote,
	postSupplierInvoice,
	reverseSupplierPaymentApplication,
} from "./facade/capabilities";
export type { PayablesCommandOptions } from "./facade/contracts";
export type {
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
	ThreeWayMatchResult,
	ThreeWayMatchStatus,
} from "./kernel/contracts/domain";
export {
	SUPPLIER_INVOICE_STATUSES,
	THREE_WAY_MATCH_STATUSES,
} from "./kernel/contracts/domain";
export type { PayablesEffects } from "./kernel/contracts/effects";
export type {
	GoodsReceiptMatchBasis,
	GoodsReceiptMatchQueryPort,
	PostedPaymentBasis,
	PostedPaymentQueryPort,
	PurchaseOrderMatchBasis,
	PurchaseOrderMatchQueryPort,
} from "./kernel/contracts/ports";
export {
	type PayablesAuthorizationPort,
	type PayablesPermission,
	requirePayablesPermission,
} from "./kernel/execution/authorization";
export type { MemoryPayablesStore } from "./testing/memory-store";
export { createMemoryPayablesStore } from "./testing/memory-store";
