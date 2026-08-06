import { PAYROLL_PERMISSION_RECONCILIATION_MANAGE } from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "settlement-ingress" as const;

export const PAYROLL_SETTLEMENT_INGRESS_COMMANDS =
	definePayrollOperationRegistry({
		recordPaymentSettlement: {
			id: "payroll.settlement-ingress.payment.record",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
			publicName: "recordPaymentSettlement",
		},
		recordPostingConfirmation: {
			id: "payroll.settlement-ingress.posting.record",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
			publicName: "recordPostingConfirmation",
		},
		resolveReconciliationDiscrepancy: {
			id: "payroll.settlement-ingress.discrepancy.resolve",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
			publicName: "resolveReconciliationDiscrepancy",
		},
	});
