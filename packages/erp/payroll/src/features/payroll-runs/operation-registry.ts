import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payroll-runs" as const;

/**
 * run.calculate is owned here (aggregate-based ownership: it is a payroll_run
 * lifecycle transition); the calculation capsule is the engine it consumes.
 */
export const PAYROLL_RUN_COMMANDS = definePayrollOperationRegistry({
	createRun: {
		id: PAYROLL_PERMISSION_RUN_CREATE,
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CREATE,
		publicName: "createRun",
	},
	calculateRun: {
		id: PAYROLL_PERMISSION_RUN_CALCULATE,
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
		publicName: "calculateRun",
	},
	finalizeRun: {
		id: PAYROLL_PERMISSION_RUN_FINALIZE,
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_FINALIZE,
		publicName: "finalizeRun",
	},
	reverseRun: {
		id: PAYROLL_PERMISSION_RUN_REVERSE,
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVERSE,
		publicName: "reverseRun",
	},
});

export const PAYROLL_RUN_QUERIES = definePayrollOperationRegistry({
	getRun: {
		id: "payroll.run.get",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "getRun",
	},
});
