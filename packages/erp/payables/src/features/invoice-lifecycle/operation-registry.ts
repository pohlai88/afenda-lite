import { definePayablesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "invoice-lifecycle" as const;

export const PAYABLES_INVOICE_COMMANDS = definePayablesOperationRegistry({
	createDraftSupplierInvoice: {
		id: "payables.invoice.create",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "createDraftSupplierInvoice",
	},
	addSupplierInvoiceLine: {
		id: "payables.invoice.line.add",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "addSupplierInvoiceLine",
	},
	matchSupplierInvoice: {
		id: "payables.invoice.match",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "matchSupplierInvoice",
	},
	postSupplierInvoice: {
		id: "payables.invoice.post",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "postSupplierInvoice",
	},
	cancelSupplierInvoice: {
		id: "payables.invoice.cancel",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "cancelSupplierInvoice",
	},
});

export const PAYABLES_INVOICE_QUERIES = definePayablesOperationRegistry({
	getSupplierInvoiceById: {
		id: "payables.invoice.get",
		kind: "query",
		owner: OWNER,
		permission: "payables.read",
		publicName: "getSupplierInvoiceById",
	},
	listSupplierInvoices: {
		id: "payables.invoice.list",
		kind: "query",
		owner: OWNER,
		permission: "payables.read",
		publicName: "listSupplierInvoices",
	},
});
