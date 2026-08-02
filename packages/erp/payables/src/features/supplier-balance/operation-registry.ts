import { definePayablesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "supplier-balance" as const;

export const PAYABLES_BALANCE_QUERIES = definePayablesOperationRegistry({
	getSupplierBalance: {
		id: "payables.balance.get",
		kind: "query",
		owner: OWNER,
		permission: "payables.read",
		publicName: "getSupplierBalance",
	},
});
