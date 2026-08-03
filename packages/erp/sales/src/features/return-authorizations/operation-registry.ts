import { defineSalesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "return-authorizations" as const;

export const SALES_RETURN_COMMANDS = defineSalesOperationRegistry({
	createReturnAuthorization: {
		id: "sales.return.create",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.create",
		publicName: "createReturnAuthorization",
	},
	addReturnAuthorizationLine: {
		id: "sales.return.line.add",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.create",
		publicName: "addReturnAuthorizationLine",
	},
	submitReturnAuthorization: {
		id: "sales.return.submit",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.create",
		publicName: "submitReturnAuthorization",
	},
	approveReturnAuthorization: {
		id: "sales.return.approve",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.approve",
		publicName: "approveReturnAuthorization",
	},
	rejectReturnAuthorization: {
		id: "sales.return.reject",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.approve",
		publicName: "rejectReturnAuthorization",
	},
	cancelReturnAuthorization: {
		id: "sales.return.cancel",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.cancel",
		publicName: "cancelReturnAuthorization",
	},
	closeReturnAuthorization: {
		id: "sales.return.close",
		kind: "command",
		owner: OWNER,
		permission: "sales.return.approve",
		publicName: "closeReturnAuthorization",
	},
});

export const SALES_RETURN_QUERIES = defineSalesOperationRegistry({
	getReturnAuthorization: {
		id: "sales.return.get",
		kind: "query",
		owner: OWNER,
		permission: "sales.return.read",
		publicName: "getReturnAuthorization",
	},
	listReturnAuthorizations: {
		id: "sales.return.list",
		kind: "query",
		owner: OWNER,
		permission: "sales.return.read",
		publicName: "listReturnAuthorizations",
	},
});
