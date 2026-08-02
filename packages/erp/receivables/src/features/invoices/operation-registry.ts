import { defineReceivablesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "invoices" as const;

export const RECEIVABLES_INVOICE_COMMANDS = defineReceivablesOperationRegistry({
	createDraftSalesInvoice: {
		id: "receivables.invoice.create",
		kind: "command",
		owner: OWNER,
		permission: "receivables.invoice.create",
		publicName: "createDraftSalesInvoice",
	},
	addSalesInvoiceLine: {
		id: "receivables.invoice.line.add",
		kind: "command",
		owner: OWNER,
		permission: "receivables.invoice.update",
		publicName: "addSalesInvoiceLine",
	},
	postSalesInvoice: {
		id: "receivables.invoice.post",
		kind: "command",
		owner: OWNER,
		permission: "receivables.invoice.post",
		publicName: "postSalesInvoice",
	},
	issueCreditNote: {
		id: "receivables.credit_note.issue",
		kind: "command",
		owner: OWNER,
		permission: "receivables.credit_note.issue",
		publicName: "issueCreditNote",
	},
	applyCustomerReceipt: {
		id: "receivables.receipt.apply",
		kind: "command",
		owner: OWNER,
		permission: "receivables.receipt.apply",
		publicName: "applyCustomerReceipt",
	},
	reverseCustomerReceiptApplication: {
		id: "receivables.receipt_application.reverse",
		kind: "command",
		owner: OWNER,
		permission: "receivables.receipt_application.reverse",
		publicName: "reverseCustomerReceiptApplication",
	},
	cancelDraftSalesInvoice: {
		id: "receivables.invoice.cancel",
		kind: "command",
		owner: OWNER,
		permission: "receivables.invoice.cancel",
		publicName: "cancelDraftSalesInvoice",
	},
	closeSalesInvoice: {
		id: "receivables.invoice.close",
		kind: "command",
		owner: OWNER,
		permission: "receivables.invoice.close",
		publicName: "closeSalesInvoice",
	},
});

export const RECEIVABLES_INVOICE_QUERIES = defineReceivablesOperationRegistry({
	getSalesInvoiceById: {
		id: "receivables.invoice.get",
		kind: "query",
		owner: OWNER,
		permission: "receivables.invoice.read",
		publicName: "getSalesInvoiceById",
	},
	listSalesInvoices: {
		id: "receivables.invoice.list",
		kind: "query",
		owner: OWNER,
		permission: "receivables.invoice.read",
		publicName: "listSalesInvoices",
	},
	getCustomerBalance: {
		id: "receivables.balance.get",
		kind: "query",
		owner: OWNER,
		permission: "receivables.balance.read",
		publicName: "getCustomerBalance",
	},
	getCustomerAging: {
		id: "receivables.aging.get",
		kind: "query",
		owner: OWNER,
		permission: "receivables.aging.read",
		publicName: "getCustomerAging",
	},
});
