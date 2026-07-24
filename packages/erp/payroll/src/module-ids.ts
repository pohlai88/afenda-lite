/** Payroll command / query IDs — package authority for MODULE registers. */

export const PAYROLL_COMMAND_SETUP_CALENDAR_CREATE =
	"payroll.setup.calendar.create" as const;
export const PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE =
	"payroll.setup.calendar.update" as const;
export const PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE =
	"payroll.setup.calendar.archive" as const;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE =
	"payroll.setup.pay-group.create" as const;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE =
	"payroll.setup.pay-group.update" as const;
export const PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE =
	"payroll.setup.pay-group.archive" as const;
export const PAYROLL_COMMAND_SETUP_PERIOD_CREATE =
	"payroll.setup.period.create" as const;
export const PAYROLL_COMMAND_SETUP_PERIOD_UPDATE =
	"payroll.setup.period.update" as const;
export const PAYROLL_COMMAND_SETUP_PERIOD_CLOSE =
	"payroll.setup.period.close" as const;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE =
	"payroll.setup.earning-rule.create" as const;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE =
	"payroll.setup.earning-rule.update" as const;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE =
	"payroll.setup.earning-rule.archive" as const;
export const PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE =
	"payroll.setup.earning-rule.supersede" as const;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE =
	"payroll.setup.deduction-rule.create" as const;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE =
	"payroll.setup.deduction-rule.update" as const;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE =
	"payroll.setup.deduction-rule.archive" as const;
export const PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE =
	"payroll.setup.deduction-rule.supersede" as const;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE =
	"payroll.setup.statutory-rule.create" as const;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE =
	"payroll.setup.statutory-rule.update" as const;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE =
	"payroll.setup.statutory-rule.archive" as const;
export const PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE =
	"payroll.setup.statutory-rule.supersede" as const;

export const PAYROLL_COMMAND_ASSIGNMENT_CREATE =
	"payroll.assignment.create" as const;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE =
	"payroll.assignment.recurring-earning.create" as const;
export const PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE =
	"payroll.assignment.recurring-deduction.create" as const;
export const PAYROLL_COMMAND_INPUT_VARIABLE_CREATE =
	"payroll.input.variable.create" as const;

export const PAYROLL_COMMAND_RUN_CREATE = "payroll.run.create" as const;
export const PAYROLL_COMMAND_RUN_CALCULATE = "payroll.run.calculate" as const;
export const PAYROLL_COMMAND_RUN_REVIEW = "payroll.run.review" as const;
export const PAYROLL_COMMAND_RUN_FINALIZE = "payroll.run.finalize" as const;
export const PAYROLL_COMMAND_RUN_REVERSE = "payroll.run.reverse" as const;

export const PAYROLL_COMMAND_IDS = [
	PAYROLL_COMMAND_SETUP_CALENDAR_CREATE,
	PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE,
	PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE,
	PAYROLL_COMMAND_SETUP_PERIOD_CREATE,
	PAYROLL_COMMAND_SETUP_PERIOD_UPDATE,
	PAYROLL_COMMAND_SETUP_PERIOD_CLOSE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE,
	PAYROLL_COMMAND_ASSIGNMENT_CREATE,
	PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE,
	PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE,
	PAYROLL_COMMAND_INPUT_VARIABLE_CREATE,
	PAYROLL_COMMAND_RUN_CREATE,
	PAYROLL_COMMAND_RUN_CALCULATE,
	PAYROLL_COMMAND_RUN_REVIEW,
	PAYROLL_COMMAND_RUN_FINALIZE,
	PAYROLL_COMMAND_RUN_REVERSE,
] as const;

export type PayrollCommandId = (typeof PAYROLL_COMMAND_IDS)[number];

export const PAYROLL_QUERY_SETUP_CALENDAR_GET =
	"payroll.setup.calendar.get" as const;
export const PAYROLL_QUERY_SETUP_CALENDAR_LIST =
	"payroll.setup.calendar.list" as const;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_GET =
	"payroll.setup.pay-group.get" as const;
export const PAYROLL_QUERY_SETUP_PAY_GROUP_LIST =
	"payroll.setup.pay-group.list" as const;
export const PAYROLL_QUERY_SETUP_PERIOD_GET =
	"payroll.setup.period.get" as const;
export const PAYROLL_QUERY_SETUP_PERIOD_LIST =
	"payroll.setup.period.list" as const;
export const PAYROLL_QUERY_SETUP_EARNING_RULE_GET =
	"payroll.setup.earning-rule.get" as const;
export const PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET =
	"payroll.setup.deduction-rule.get" as const;
export const PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET =
	"payroll.setup.statutory-rule.get" as const;

export const PAYROLL_QUERY_ASSIGNMENT_GET =
	"payroll.assignment.get" as const;
export const PAYROLL_QUERY_INPUT_VARIABLE_GET =
	"payroll.input.variable.get" as const;

export const PAYROLL_QUERY_RUN_GET = "payroll.run.get" as const;
export const PAYROLL_QUERY_RUN_LIST = "payroll.run.list" as const;
export const PAYROLL_QUERY_PAYSLIP_GET_OWN = "payroll.payslip.get-own" as const;
export const PAYROLL_QUERY_PAYSLIP_GET = "payroll.payslip.get" as const;

export const PAYROLL_QUERY_IDS = [
	PAYROLL_QUERY_SETUP_CALENDAR_GET,
	PAYROLL_QUERY_SETUP_CALENDAR_LIST,
	PAYROLL_QUERY_SETUP_PAY_GROUP_GET,
	PAYROLL_QUERY_SETUP_PAY_GROUP_LIST,
	PAYROLL_QUERY_SETUP_PERIOD_GET,
	PAYROLL_QUERY_SETUP_PERIOD_LIST,
	PAYROLL_QUERY_SETUP_EARNING_RULE_GET,
	PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET,
	PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET,
	PAYROLL_QUERY_ASSIGNMENT_GET,
	PAYROLL_QUERY_INPUT_VARIABLE_GET,
	PAYROLL_QUERY_RUN_GET,
	PAYROLL_QUERY_RUN_LIST,
	PAYROLL_QUERY_PAYSLIP_GET_OWN,
	PAYROLL_QUERY_PAYSLIP_GET,
] as const;

export type PayrollQueryId = (typeof PAYROLL_QUERY_IDS)[number];
