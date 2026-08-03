import { defineSalesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "quotation-management" as const;

export const SALES_QUOTATION_COMMANDS = defineSalesOperationRegistry({
	createDraftSalesQuotation: {
		id: "sales.quotation.create",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.create",
		publicName: "createDraftSalesQuotation",
	},
	addSalesQuotationLine: {
		id: "sales.quotation.line.add",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "addSalesQuotationLine",
	},
	submitSalesQuotation: {
		id: "sales.quotation.submit",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "submitSalesQuotation",
	},
	approveSalesQuotation: {
		id: "sales.quotation.approve",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.approve",
		publicName: "approveSalesQuotation",
	},
	sendSalesQuotation: {
		id: "sales.quotation.send",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "sendSalesQuotation",
	},
	acceptSalesQuotation: {
		id: "sales.quotation.accept",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "acceptSalesQuotation",
	},
	expireSalesQuotation: {
		id: "sales.quotation.expire",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "expireSalesQuotation",
	},
	rejectSalesQuotation: {
		id: "sales.quotation.reject",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.approve",
		publicName: "rejectSalesQuotation",
	},
	cancelSalesQuotation: {
		id: "sales.quotation.cancel",
		kind: "command",
		owner: OWNER,
		permission: "sales.quotation.update",
		publicName: "cancelSalesQuotation",
	},
	convertSalesQuotationToOrder: {
		id: "sales.quotation.convert",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.create",
		publicName: "convertSalesQuotationToOrder",
	},
});

export const SALES_QUOTATION_QUERIES = defineSalesOperationRegistry({
	getSalesQuotation: {
		id: "sales.quotation.get",
		kind: "query",
		owner: OWNER,
		permission: "sales.quotation.read",
		publicName: "getSalesQuotation",
	},
	listSalesQuotations: {
		id: "sales.quotation.list",
		kind: "query",
		owner: OWNER,
		permission: "sales.quotation.read",
		publicName: "listSalesQuotations",
	},
});
