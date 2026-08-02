import {
	PAYMENTS_PERMISSION_METHOD_MANAGE,
	PAYMENTS_PERMISSION_METHOD_READ,
} from "../../kernel/execution/permissions";
import { definePaymentsOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payment-methods" as const;

export const PAYMENTS_METHOD_COMMANDS = definePaymentsOperationRegistry({
	createPaymentMethod: {
		id: "payments.method.create",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_METHOD_MANAGE,
		publicName: "createPaymentMethod",
	},
	updatePaymentMethod: {
		id: "payments.method.update",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_METHOD_MANAGE,
		publicName: "updatePaymentMethod",
	},
	deactivatePaymentMethod: {
		id: "payments.method.deactivate",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_METHOD_MANAGE,
		publicName: "deactivatePaymentMethod",
	},
	seedDefaultPaymentMethods: {
		id: "payments.method.seed_defaults",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_METHOD_MANAGE,
		publicName: "seedDefaultPaymentMethods",
	},
});

export const PAYMENTS_METHOD_QUERIES = definePaymentsOperationRegistry({
	listPaymentMethods: {
		id: "payments.method.list",
		kind: "query",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_METHOD_READ,
		publicName: "listPaymentMethods",
	},
});
