import { PAYROLL_PERMISSION_INPUT_MANAGE } from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "workforce-ingress" as const;

export const PAYROLL_WORKFORCE_INGRESS_COMMANDS =
	definePayrollOperationRegistry({
		ingestApprovedPayrollHandoff: {
			id: "payroll.workforce.ingest",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_INPUT_MANAGE,
			publicName: "ingestApprovedPayrollHandoff",
		},
	});
