import {
	PAYMENTS_PERMISSION_ACCOUNT_MANAGE,
	PAYMENTS_PERMISSION_ACCOUNT_READ,
} from "../../kernel/execution/permissions";
import { definePaymentsOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payment-accounts" as const;

export const PAYMENTS_ACCOUNT_COMMANDS = definePaymentsOperationRegistry({
	createPaymentAccount: {
		id: "payments.account.create",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_ACCOUNT_MANAGE,
		publicName: "createPaymentAccount",
	},
});

export const PAYMENTS_ACCOUNT_QUERIES = definePaymentsOperationRegistry({
	listPaymentAccounts: {
		id: "payments.account.list",
		kind: "query",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_ACCOUNT_READ,
		publicName: "listPaymentAccounts",
	},
});
