import { PAYROLL_PERMISSION_RECONCILIATION_MANAGE } from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "reconciliation" as const;

export const PAYROLL_RECONCILIATION_COMMANDS = definePayrollOperationRegistry({
	recordReconciliation: {
		id: "payroll.reconciliation.record",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
		publicName: "recordReconciliation",
	},
	resolveReconciliation: {
		id: "payroll.reconciliation.resolve",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
		publicName: "resolveReconciliation",
	},
});

export const PAYROLL_RECONCILIATION_QUERIES = definePayrollOperationRegistry({
	listReconciliations: {
		id: "payroll.reconciliation.list",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
		publicName: "listReconciliations",
	},
});
