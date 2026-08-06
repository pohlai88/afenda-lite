import {
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "payroll-jobs" as const;

export const PAYROLL_JOB_COMMANDS = definePayrollOperationRegistry({
	enqueuePayrollCalculationJob: {
		id: "payroll.jobs.calculation.enqueue",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
		publicName: "enqueuePayrollCalculationJob",
	},
	claimDuePayrollJobWork: {
		id: "payroll.jobs.work.claim",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
		publicName: "claimDuePayrollJobWork",
	},
	executePayrollJobWork: {
		id: "payroll.jobs.work.execute",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
		publicName: "executePayrollJobWork",
	},
	replayPayrollDeadLetter: {
		id: "payroll.jobs.dead-letter.replay",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
		publicName: "replayPayrollDeadLetter",
	},
});

export const PAYROLL_JOB_QUERIES = definePayrollOperationRegistry({
	getPayrollJob: {
		id: "payroll.jobs.job.get",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "getPayrollJob",
	},
	listPayrollDeadLetters: {
		id: "payroll.jobs.dead-letter.list",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "listPayrollDeadLetters",
	},
});
