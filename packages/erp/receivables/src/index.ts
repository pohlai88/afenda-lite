import "server-only";

export {
	addSalesInvoiceLine,
	applyCustomerReceipt,
	cancelDraftSalesInvoice,
	closeSalesInvoice,
	createDraftSalesInvoice,
	expectedOpenBalance,
	getCustomerAging,
	getCustomerBalance,
	getSalesInvoiceById,
	issueCreditNote,
	listSalesInvoices,
	postSalesInvoice,
	reverseCustomerAllocationsByPayment,
	reverseCustomerReceiptApplication,
} from "./facade/capabilities";
export type { ReceivablesCommandOptions } from "./facade/contracts";
export {
	type ReceivablesReconcileFacts,
	type ReceivablesReconcileResult,
	reconcileReceivables,
} from "./facade/reconcile";
export {
	createDrizzleReceivablesStore,
	DrizzleReceivablesStore,
} from "./features/invoices/invoices.drizzle";
export {
	createMemoryReceivablesStore,
	MemoryReceivablesStore,
} from "./features/invoices/invoices.memory";
export * from "./features/invoices/invoices.schema";
export type {
	InvoiceCreateRecord,
	ReceivablesStore,
} from "./features/invoices/invoices.store";
export type * from "./kernel/contracts/domain";
export type * from "./kernel/contracts/ports";
export {
	type ReceivablesAuthorizationPort,
	type ReceivablesPermission,
	requireReceivablesCommandPermission,
	requireReceivablesQueryPermission,
} from "./kernel/execution/authorization";
export * from "./kernel/execution/permissions";
