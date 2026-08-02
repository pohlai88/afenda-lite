import {
	PAYMENTS_PERMISSION_PAYMENT_CREATE,
	PAYMENTS_PERMISSION_PAYMENT_POST,
	PAYMENTS_PERMISSION_PAYMENT_READ,
	PAYMENTS_PERMISSION_PAYMENT_REVERSE,
	PAYMENTS_PERMISSION_PAYMENT_UPDATE,
	PAYMENTS_PERMISSION_REFUND_CREATE,
	PAYMENTS_PERMISSION_REFUND_POST,
	PAYMENTS_PERMISSION_TRANSFER_CREATE,
	PAYMENTS_PERMISSION_TRANSFER_POST,
} from "../../kernel/execution/permissions";
import { definePaymentsOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payment-lifecycle" as const;

export const PAYMENTS_LIFECYCLE_COMMANDS = definePaymentsOperationRegistry({
	createDraftPayment: {
		id: "payments.payment.create",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_CREATE,
		publicName: "createDraftPayment",
	},
	postPayment: {
		id: "payments.payment.post",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_POST,
		publicName: "postPayment",
	},
	reversePayment: {
		id: "payments.payment.reverse",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_REVERSE,
		publicName: "reversePayment",
	},
	updateInstrumentClearance: {
		id: "payments.payment.update_instrument_clearance",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_UPDATE,
		publicName: "updateInstrumentClearance",
	},
	createAndPostPaymentTransfer: {
		id: "payments.transfer.create_and_post",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_TRANSFER_POST,
		// Enforced in code alongside the manifest-declared post permission.
		additionalPermissions: [PAYMENTS_PERMISSION_TRANSFER_CREATE],
		publicName: "createAndPostPaymentTransfer",
	},
	postRefund: {
		id: "payments.refund.post",
		kind: "command",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_REFUND_POST,
		// Enforced in code alongside the manifest-declared post permission.
		additionalPermissions: [PAYMENTS_PERMISSION_REFUND_CREATE],
		publicName: "postRefund",
	},
});

export const PAYMENTS_LIFECYCLE_QUERIES = definePaymentsOperationRegistry({
	getPaymentById: {
		id: "payments.payment.get",
		kind: "query",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_READ,
		publicName: "getPaymentById",
	},
	listPayments: {
		id: "payments.payment.list",
		kind: "query",
		owner: OWNER,
		permission: PAYMENTS_PERMISSION_PAYMENT_READ,
		publicName: "listPayments",
	},
});
