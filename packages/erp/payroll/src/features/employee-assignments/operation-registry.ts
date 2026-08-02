import { PAYROLL_PERMISSION_SETUP_MANAGE } from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "employee-assignments" as const;

export const PAYROLL_ASSIGNMENT_COMMANDS = definePayrollOperationRegistry({
	createAssignment: {
		id: "payroll.assignment.create",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
		publicName: "createAssignment",
	},
	createRecurringEarning: {
		id: "payroll.assignment.recurring-earning.create",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
		publicName: "createRecurringEarning",
	},
	createRecurringDeduction: {
		id: "payroll.assignment.recurring-deduction.create",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
		publicName: "createRecurringDeduction",
	},
});

export const PAYROLL_ASSIGNMENT_QUERIES = definePayrollOperationRegistry({
	getAssignment: {
		id: "payroll.assignment.get",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
		publicName: "getAssignment",
	},
});
