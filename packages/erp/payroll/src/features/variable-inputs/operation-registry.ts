import { PAYROLL_PERMISSION_INPUT_MANAGE } from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "variable-inputs" as const;

export const PAYROLL_VARIABLE_INPUT_COMMANDS = definePayrollOperationRegistry({
	createVariableInput: {
		id: "payroll.input.variable.create",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
		publicName: "createVariableInput",
	},
});

export const PAYROLL_VARIABLE_INPUT_QUERIES = definePayrollOperationRegistry({
	getVariableInput: {
		id: "payroll.input.variable.get",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
		publicName: "getVariableInput",
	},
});
