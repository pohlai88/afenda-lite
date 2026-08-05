import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "final-settlement" as const;

export const PAYROLL_FINAL_SETTLEMENT_COMMANDS = definePayrollOperationRegistry(
	{
		initiateFinalSettlement: {
			id: "payroll.final-settlement.initiate",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_CREATE,
			publicName: "initiateFinalSettlement",
		},
		calculateFinalSettlement: {
			id: "payroll.final-settlement.calculate",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_CALCULATE,
			publicName: "calculateFinalSettlement",
		},
		finalizeFinalSettlement: {
			id: "payroll.final-settlement.finalize",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_FINALIZE,
			publicName: "finalizeFinalSettlement",
		},
		issueFinalSettlementStatement: {
			id: "payroll.final-settlement.statement.issue",
			kind: "command",
			owner: OWNER,
			permission: PAYROLL_PERMISSION_RUN_REVIEW,
			publicName: "issueFinalSettlementStatement",
		},
	},
);
