import { definePayablesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "allocations" as const;

export const PAYABLES_ALLOCATION_COMMANDS = definePayablesOperationRegistry({
	applySupplierPayment: {
		id: "payables.payment.apply",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "applySupplierPayment",
	},
	applySupplierCredit: {
		id: "payables.credit.apply",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "applySupplierCredit",
	},
	reverseSupplierPaymentApplication: {
		id: "payables.payment_application.reverse",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "reverseSupplierPaymentApplication",
	},
});
