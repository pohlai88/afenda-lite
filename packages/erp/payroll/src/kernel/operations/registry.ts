import {
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_SETUP_MANAGE,
	type PayrollPermission,
} from "../execution/permissions";

const PAYROLL_OPERATION_OWNER = "payroll" as const;

interface PayrollOperationDefinition {
	readonly id: `payroll.${string}`;
	readonly kind: "command" | "query";
	readonly owner: typeof PAYROLL_OPERATION_OWNER;
	readonly permission: PayrollPermission;
}

/** Canonical Payroll operation identity and authorization policy. */
export const PAYROLL_OPERATION_DEFINITIONS = {
	createCalendar: {
		id: "payroll.setup.calendar.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updateCalendar: {
		id: "payroll.setup.calendar.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	archiveCalendar: {
		id: "payroll.setup.calendar.archive",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createPayGroup: {
		id: "payroll.setup.pay-group.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updatePayGroup: {
		id: "payroll.setup.pay-group.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	archivePayGroup: {
		id: "payroll.setup.pay-group.archive",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createPeriod: {
		id: "payroll.setup.period.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updatePeriod: {
		id: "payroll.setup.period.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	closePeriod: {
		id: "payroll.setup.period.close",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createEarningRule: {
		id: "payroll.setup.earning-rule.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updateEarningRule: {
		id: "payroll.setup.earning-rule.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	archiveEarningRule: {
		id: "payroll.setup.earning-rule.archive",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	supersedeEarningRule: {
		id: "payroll.setup.earning-rule.supersede",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createDeductionRule: {
		id: "payroll.setup.deduction-rule.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updateDeductionRule: {
		id: "payroll.setup.deduction-rule.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	archiveDeductionRule: {
		id: "payroll.setup.deduction-rule.archive",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	supersedeDeductionRule: {
		id: "payroll.setup.deduction-rule.supersede",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createStatutoryRule: {
		id: "payroll.setup.statutory-rule.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	updateStatutoryRule: {
		id: "payroll.setup.statutory-rule.update",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	archiveStatutoryRule: {
		id: "payroll.setup.statutory-rule.archive",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	supersedeStatutoryRule: {
		id: "payroll.setup.statutory-rule.supersede",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createAssignment: {
		id: "payroll.assignment.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createRecurringEarning: {
		id: "payroll.assignment.recurring-earning.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createRecurringDeduction: {
		id: "payroll.assignment.recurring-deduction.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	createVariableInput: {
		id: "payroll.input.variable.create",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
	},
	createRun: {
		id: PAYROLL_PERMISSION_RUN_CREATE,
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RUN_CREATE,
	},
	calculateRun: {
		id: PAYROLL_PERMISSION_RUN_CALCULATE,
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RUN_CALCULATE,
	},
	finalizeRun: {
		id: PAYROLL_PERMISSION_RUN_FINALIZE,
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RUN_FINALIZE,
	},
	reverseRun: {
		id: PAYROLL_PERMISSION_RUN_REVERSE,
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVERSE,
	},
	recordReconciliation: {
		id: "payroll.reconciliation.record",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	},
	resolveReconciliation: {
		id: "payroll.reconciliation.resolve",
		kind: "command",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	},
	getCalendar: {
		id: "payroll.setup.calendar.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	listCalendars: {
		id: "payroll.setup.calendar.list",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getPayGroup: {
		id: "payroll.setup.pay-group.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	listPayGroups: {
		id: "payroll.setup.pay-group.list",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getPeriod: {
		id: "payroll.setup.period.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	listPeriods: {
		id: "payroll.setup.period.list",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getEarningRule: {
		id: "payroll.setup.earning-rule.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getDeductionRule: {
		id: "payroll.setup.deduction-rule.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getStatutoryRule: {
		id: "payroll.setup.statutory-rule.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getAssignment: {
		id: "payroll.assignment.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_SETUP_MANAGE,
	},
	getVariableInput: {
		id: "payroll.input.variable.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_INPUT_MANAGE,
	},
	getRun: {
		id: "payroll.run.get",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RUN_REVIEW,
	},
	readOwnPayslip: {
		id: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	},
	readAllPayslips: {
		id: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	},
	listReconciliations: {
		id: "payroll.reconciliation.list",
		kind: "query",
		owner: PAYROLL_OPERATION_OWNER,
		permission: PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	},
} as const satisfies Record<string, PayrollOperationDefinition>;

type PayrollOperation =
	(typeof PAYROLL_OPERATION_DEFINITIONS)[keyof typeof PAYROLL_OPERATION_DEFINITIONS];
type PayrollCommandOperation = Extract<PayrollOperation, { kind: "command" }>;
type PayrollQueryOperation = Extract<PayrollOperation, { kind: "query" }>;

const operationDefinitions = Object.values(PAYROLL_OPERATION_DEFINITIONS);
for (const definition of operationDefinitions) {
	Object.freeze(definition);
}
Object.freeze(PAYROLL_OPERATION_DEFINITIONS);

const operationIds = new Set(operationDefinitions.map(({ id }) => id));
if (operationIds.size !== operationDefinitions.length) {
	throw new Error("Payroll operation IDs must be unique");
}

const commandDefinitions = operationDefinitions.filter(
	(definition): definition is PayrollCommandOperation =>
		definition.kind === "command",
);
const queryDefinitions = operationDefinitions.filter(
	(definition): definition is PayrollQueryOperation =>
		definition.kind === "query",
);

function projectAuthorization<
	TDefinition extends {
		readonly id: string;
		readonly permission: PayrollPermission;
	},
>(definitions: readonly TDefinition[]) {
	return Object.freeze(
		Object.fromEntries(
			definitions.map(({ id, permission }) => [id, permission]),
		),
	) as Readonly<Record<TDefinition["id"], PayrollPermission>>;
}

export type PayrollCommandId = PayrollCommandOperation["id"];
export type PayrollQueryId = PayrollQueryOperation["id"];

export const PAYROLL_COMMAND_IDS = Object.freeze(
	commandDefinitions.map(({ id }) => id),
);
export const PAYROLL_QUERY_IDS = Object.freeze(
	queryDefinitions.map(({ id }) => id),
);
export const PAYROLL_COMMAND_AUTHORIZATION =
	projectAuthorization(commandDefinitions);
export const PAYROLL_QUERY_AUTHORIZATION =
	projectAuthorization(queryDefinitions);

export const PAYROLL_COMMAND_SETUP_CALENDAR_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createCalendar.id;
export const PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateCalendar.id;
export const PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveCalendar.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createPayGroup.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updatePayGroup.id;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archivePayGroup.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createPeriod.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updatePeriod.id;
export const PAYROLL_COMMAND_SETUP_PERIOD_CLOSE =
	PAYROLL_OPERATION_DEFINITIONS.closePeriod.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveEarningRule.id;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeEarningRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeDeductionRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE =
	PAYROLL_OPERATION_DEFINITIONS.updateStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE =
	PAYROLL_OPERATION_DEFINITIONS.archiveStatutoryRule.id;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE =
	PAYROLL_OPERATION_DEFINITIONS.supersedeStatutoryRule.id;
export const PAYROLL_COMMAND_ASSIGNMENT_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createAssignment.id;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRecurringEarning.id;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRecurringDeduction.id;
export const PAYROLL_COMMAND_INPUT_VARIABLE_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createVariableInput.id;
export const PAYROLL_COMMAND_RUN_CREATE =
	PAYROLL_OPERATION_DEFINITIONS.createRun.id;
export const PAYROLL_COMMAND_RUN_CALCULATE =
	PAYROLL_OPERATION_DEFINITIONS.calculateRun.id;
export const PAYROLL_COMMAND_RUN_FINALIZE =
	PAYROLL_OPERATION_DEFINITIONS.finalizeRun.id;
export const PAYROLL_COMMAND_RUN_REVERSE =
	PAYROLL_OPERATION_DEFINITIONS.reverseRun.id;
export const PAYROLL_COMMAND_RECONCILIATION_RECORD =
	PAYROLL_OPERATION_DEFINITIONS.recordReconciliation.id;
export const PAYROLL_COMMAND_RECONCILIATION_RESOLVE =
	PAYROLL_OPERATION_DEFINITIONS.resolveReconciliation.id;

export const PAYROLL_QUERY_SETUP_CALENDAR_GET =
	PAYROLL_OPERATION_DEFINITIONS.getCalendar.id;
export const PAYROLL_QUERY_SETUP_CALENDAR_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listCalendars.id;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_GET =
	PAYROLL_OPERATION_DEFINITIONS.getPayGroup.id;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listPayGroups.id;
export const PAYROLL_QUERY_SETUP_PERIOD_GET =
	PAYROLL_OPERATION_DEFINITIONS.getPeriod.id;
export const PAYROLL_QUERY_SETUP_PERIOD_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listPeriods.id;
export const PAYROLL_QUERY_SETUP_EARNING_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getEarningRule.id;
export const PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getDeductionRule.id;
export const PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getStatutoryRule.id;
export const PAYROLL_QUERY_ASSIGNMENT_GET =
	PAYROLL_OPERATION_DEFINITIONS.getAssignment.id;
export const PAYROLL_QUERY_INPUT_VARIABLE_GET =
	PAYROLL_OPERATION_DEFINITIONS.getVariableInput.id;
export const PAYROLL_QUERY_RUN_GET = PAYROLL_OPERATION_DEFINITIONS.getRun.id;
export const PAYROLL_QUERY_PAYSLIP_READ_OWN =
	PAYROLL_OPERATION_DEFINITIONS.readOwnPayslip.id;
export const PAYROLL_QUERY_PAYSLIP_READ_ALL =
	PAYROLL_OPERATION_DEFINITIONS.readAllPayslips.id;
export const PAYROLL_QUERY_RECONCILIATION_LIST =
	PAYROLL_OPERATION_DEFINITIONS.listReconciliations.id;
