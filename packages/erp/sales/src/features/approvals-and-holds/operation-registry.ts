import { defineSalesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "approvals-and-holds" as const;

export const SALES_HOLD_COMMANDS = defineSalesOperationRegistry({
	placeSalesOrderHold: {
		id: "sales.order.hold.place",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.hold",
		publicName: "placeSalesOrderHold",
	},
	resolveSalesOrderHold: {
		id: "sales.order.hold.resolve",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.hold",
		publicName: "resolveSalesOrderHold",
	},
});
