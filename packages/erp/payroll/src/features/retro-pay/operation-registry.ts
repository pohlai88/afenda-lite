import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_RUN_REVIEW,
} from "../../kernel/execution/permissions";
import { definePayrollOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "retro-pay" as const;

export const PAYROLL_RETRO_COMMANDS = definePayrollOperationRegistry({
	queueRetroItem: {
		id: "payroll.retro.item.queue",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
		publicName: "queueRetroItem",
	},
	calculateRetroDifference: {
		id: "payroll.retro.difference.calculate",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "calculateRetroDifference",
	},
	applyRetroToPeriod: {
		id: "payroll.retro.period.apply",
		kind: "command",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
		publicName: "applyRetroToPeriod",
	},
});

export const PAYROLL_RETRO_QUERIES = definePayrollOperationRegistry({
	listRetroItems: {
		id: "payroll.retro.item.list",
		kind: "query",
		owner: OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
		publicName: "listRetroItems",
	},
});
