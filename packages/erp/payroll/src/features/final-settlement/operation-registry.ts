import {
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
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
	},
);

/**
 * The settlement statement is a terminal payslip variant, so it keeps the
 * payslip subject-access split: `read-own` may disclose only the actor's own
 * settlement, `read-all` may disclose any subject's. It is a query — reading a
 * statement is not a `payroll.run.review` state change.
 */
export const PAYROLL_FINAL_SETTLEMENT_QUERIES = definePayrollOperationRegistry({
	readOwnFinalSettlementStatement: {
		id: "payroll.final-settlement.statement.read-own",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
		publicName: "readOwnFinalSettlementStatement",
	},
	readAllFinalSettlementStatements: {
		id: "payroll.final-settlement.statement.read-all",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		publicName: "readAllFinalSettlementStatements",
	},
});
