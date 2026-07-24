import {
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createErpScaffoldTable } from "./scaffold-table";

const payrollAuditColumns = {
	version: integer("version").notNull().default(1),
	createdBy: text("created_by").notNull(),
	updatedBy: text("updated_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
};

const payrollIdempotencyColumns = {
	createIdempotencyKey: text("create_idempotency_key").notNull(),
	createRequestFingerprint: text("create_request_fingerprint").notNull(),
};

/** Org pay calendar — scheduling reference for pay groups. */
export const payrollCalendar = pgTable(
	"payroll_calendar",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		timezone: text("timezone").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_calendar_org_id_idx").on(t.organizationId, t.id),
		index("payroll_calendar_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("payroll_calendar_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_calendar_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("payroll_calendar_org_code_from_uidx").on(
			t.organizationId,
			t.code,
			t.effectiveFrom,
		),
		check(
			"payroll_calendar_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
		check(
			"payroll_calendar_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Pay group — currency + calendar binding. */
export const payrollPayGroup = pgTable(
	"payroll_pay_group",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		calendarId: uuid("calendar_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		currencyCode: text("currency_code").notNull(),
		status: text("status").notNull(),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_pay_group_org_id_idx").on(t.organizationId, t.id),
		index("payroll_pay_group_org_calendar_idx").on(
			t.organizationId,
			t.calendarId,
		),
		uniqueIndex("payroll_pay_group_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_pay_group_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("payroll_pay_group_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.calendarId],
			foreignColumns: [payrollCalendar.organizationId, payrollCalendar.id],
			name: "payroll_pay_group_org_calendar_fk",
		}),
		check(
			"payroll_pay_group_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
	],
);

/** Pay period within a pay group. */
export const payrollPeriod = pgTable(
	"payroll_period",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		periodStart: date("period_start", { mode: "string" }).notNull(),
		periodEnd: date("period_end", { mode: "string" }).notNull(),
		cutoffDate: date("cutoff_date", { mode: "string" }).notNull(),
		status: text("status").notNull(),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_period_org_id_idx").on(t.organizationId, t.id),
		index("payroll_period_org_pay_group_idx").on(
			t.organizationId,
			t.payGroupId,
		),
		uniqueIndex("payroll_period_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_period_org_pay_group_range_uidx").on(
			t.organizationId,
			t.payGroupId,
			t.periodStart,
			t.periodEnd,
		),
		uniqueIndex("payroll_period_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_period_org_pay_group_fk",
		}),
		check(
			"payroll_period_status_check",
			sql`${t.status} IN ('open', 'closed')`,
		),
		check(
			"payroll_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

/** Effective-dated earning rule registration. */
export const payrollEarningRule = pgTable(
	"payroll_earning_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		ruleType: text("rule_type").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }),
		rate: numeric("rate", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code").notNull(),
		ruleVersion: text("rule_version").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_earning_rule_org_id_idx").on(t.organizationId, t.id),
		index("payroll_earning_rule_org_pay_group_idx").on(
			t.organizationId,
			t.payGroupId,
		),
		uniqueIndex("payroll_earning_rule_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_earning_rule_org_code_from_uidx").on(
			t.organizationId,
			t.payGroupId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("payroll_earning_rule_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_earning_rule_org_pay_group_fk",
		}),
		check(
			"payroll_earning_rule_type_check",
			sql`${t.ruleType} IN ('fixed', 'rate')`,
		),
		check(
			"payroll_earning_rule_status_check",
			sql`${t.status} IN ('active', 'superseded', 'archived')`,
		),
		check(
			"payroll_earning_rule_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Effective-dated deduction rule registration. */
export const payrollDeductionRule = pgTable(
	"payroll_deduction_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		ruleType: text("rule_type").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }),
		rate: numeric("rate", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code").notNull(),
		ruleVersion: text("rule_version").notNull(),
		taxTiming: text("tax_timing").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_deduction_rule_org_id_idx").on(t.organizationId, t.id),
		index("payroll_deduction_rule_org_pay_group_idx").on(
			t.organizationId,
			t.payGroupId,
		),
		uniqueIndex("payroll_deduction_rule_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_deduction_rule_org_code_from_uidx").on(
			t.organizationId,
			t.payGroupId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("payroll_deduction_rule_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_deduction_rule_org_pay_group_fk",
		}),
		check(
			"payroll_deduction_rule_type_check",
			sql`${t.ruleType} IN ('fixed', 'rate')`,
		),
		check(
			"payroll_deduction_rule_tax_timing_check",
			sql`${t.taxTiming} IN ('pre_tax', 'post_tax')`,
		),
		check(
			"payroll_deduction_rule_status_check",
			sql`${t.status} IN ('active', 'superseded', 'archived')`,
		),
		check(
			"payroll_deduction_rule_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Generic statutory rule registration — jurisdiction placeholder only (PAY-DEC-004). */
export const payrollStatutoryRule = pgTable(
	"payroll_statutory_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		configJson: jsonb("config_json").notNull().default({}),
		ruleVersion: text("rule_version").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_statutory_rule_org_id_idx").on(t.organizationId, t.id),
		index("payroll_statutory_rule_org_pay_group_idx").on(
			t.organizationId,
			t.payGroupId,
		),
		uniqueIndex("payroll_statutory_rule_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_statutory_rule_org_code_from_uidx").on(
			t.organizationId,
			t.payGroupId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("payroll_statutory_rule_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_statutory_rule_org_pay_group_fk",
		}),
		check(
			"payroll_statutory_rule_status_check",
			sql`${t.status} IN ('active', 'superseded', 'archived')`,
		),
		check(
			"payroll_statutory_rule_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Payroll run — lifecycle root for calculation/finalization slices. */
export const payrollRun = pgTable(
	"payroll_run",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		periodId: uuid("period_id").notNull(),
		runType: text("run_type").notNull(),
		sequence: integer("sequence").notNull().default(1),
		status: text("status").notNull(),
		finalizedAt: timestamp("finalized_at", { withTimezone: true }),
		finalizedBy: text("finalized_by"),
		calculationSnapshotHash: text("calculation_snapshot_hash"),
		calculationVersion: text("calculation_version"),
		roundingPolicyJson: jsonb("rounding_policy_json"),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_run_org_id_idx").on(t.organizationId, t.id),
		index("payroll_run_org_status_idx").on(t.organizationId, t.status),
		index("payroll_run_org_pay_group_idx").on(t.organizationId, t.payGroupId),
		index("payroll_run_org_period_idx").on(t.organizationId, t.periodId),
		uniqueIndex("payroll_run_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_run_org_identity_uidx").on(
			t.organizationId,
			t.payGroupId,
			t.periodId,
			t.runType,
			t.sequence,
		),
		uniqueIndex("payroll_run_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_run_org_pay_group_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.periodId],
			foreignColumns: [payrollPeriod.organizationId, payrollPeriod.id],
			name: "payroll_run_org_period_fk",
		}),
		check(
			"payroll_run_type_check",
			sql`${t.runType} IN ('regular', 'off_cycle', 'adjustment')`,
		),
		check(
			"payroll_run_status_check",
			sql`${t.status} IN ('draft', 'calculating', 'calculated', 'failed', 'finalized', 'reversed')`,
		),
	],
);

/** Run-scoped exception — blocking or warning. */
export const payrollException = pgTable(
	"payroll_exception",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		severity: text("severity").notNull(),
		exceptionCode: text("exception_code").notNull(),
		message: text("message").notNull(),
		employeeRef: text("employee_ref"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_exception_org_id_idx").on(t.organizationId, t.id),
		index("payroll_exception_org_run_idx").on(t.organizationId, t.runId),
		uniqueIndex("payroll_exception_org_id_uidx").on(t.organizationId, t.id),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_exception_org_run_fk",
		}),
		check(
			"payroll_exception_severity_check",
			sql`${t.severity} IN ('blocking', 'warning')`,
		),
	],
);

/** Tracks rule versions referenced by finalized runs — setup immutability guard. */
export const payrollRuleFinalizedUsage = pgTable(
	"payroll_rule_finalized_usage",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		ruleKind: text("rule_kind").notNull(),
		ruleId: uuid("rule_id").notNull(),
		runId: uuid("run_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_rule_finalized_usage_org_rule_idx").on(
			t.organizationId,
			t.ruleKind,
			t.ruleId,
		),
		uniqueIndex("payroll_rule_finalized_usage_org_rule_run_uidx").on(
			t.organizationId,
			t.ruleKind,
			t.ruleId,
			t.runId,
		),
		check(
			"payroll_rule_finalized_usage_kind_check",
			sql`${t.ruleKind} IN ('earning', 'deduction', 'statutory')`,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_rule_finalized_usage_org_run_fk",
		}),
	],
);

/** Payroll-owned employee-to-pay-group assignment (HR facts via port only). */
export const payrollEmployeeAssignment = pgTable(
	"payroll_employee_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_employee_assignment_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("payroll_employee_assignment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex("payroll_employee_assignment_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_employee_assignment_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("payroll_employee_assignment_org_employee_from_uidx").on(
			t.organizationId,
			t.employeeId,
			t.effectiveFrom,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_employee_assignment_org_pay_group_fk",
		}),
		check(
			"payroll_employee_assignment_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
		check(
			"payroll_employee_assignment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Payroll-owned recurring earning line for an assignment. */
export const payrollRecurringEarning = pgTable(
	"payroll_recurring_earning",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		assignmentId: uuid("assignment_id").notNull(),
		earningRuleId: uuid("earning_rule_id").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_recurring_earning_org_id_idx").on(t.organizationId, t.id),
		index("payroll_recurring_earning_org_assignment_idx").on(
			t.organizationId,
			t.assignmentId,
		),
		uniqueIndex("payroll_recurring_earning_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_recurring_earning_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.assignmentId],
			foreignColumns: [
				payrollEmployeeAssignment.organizationId,
				payrollEmployeeAssignment.id,
			],
			name: "payroll_recurring_earning_org_assignment_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.earningRuleId],
			foreignColumns: [
				payrollEarningRule.organizationId,
				payrollEarningRule.id,
			],
			name: "payroll_recurring_earning_org_earning_rule_fk",
		}),
		check(
			"payroll_recurring_earning_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
		check(
			"payroll_recurring_earning_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Payroll-owned recurring deduction line for an assignment. */
export const payrollRecurringDeduction = pgTable(
	"payroll_recurring_deduction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		assignmentId: uuid("assignment_id").notNull(),
		deductionRuleId: uuid("deduction_rule_id").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_recurring_deduction_org_id_idx").on(t.organizationId, t.id),
		index("payroll_recurring_deduction_org_assignment_idx").on(
			t.organizationId,
			t.assignmentId,
		),
		uniqueIndex("payroll_recurring_deduction_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_recurring_deduction_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.assignmentId],
			foreignColumns: [
				payrollEmployeeAssignment.organizationId,
				payrollEmployeeAssignment.id,
			],
			name: "payroll_recurring_deduction_org_assignment_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.deductionRuleId],
			foreignColumns: [
				payrollDeductionRule.organizationId,
				payrollDeductionRule.id,
			],
			name: "payroll_recurring_deduction_org_deduction_rule_fk",
		}),
		check(
			"payroll_recurring_deduction_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
		check(
			"payroll_recurring_deduction_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Variable earning input with external source idempotency. */
export const payrollVariableInput = pgTable(
	"payroll_variable_input",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		periodId: uuid("period_id").notNull(),
		earningRuleId: uuid("earning_rule_id").notNull(),
		earningRuleCode: text("earning_rule_code").notNull(),
		earningRuleVersion: text("earning_rule_version").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		sourceType: text("source_type").notNull(),
		sourceId: text("source_id").notNull(),
		sourceRequestFingerprint: text("source_request_fingerprint").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_variable_input_org_id_idx").on(t.organizationId, t.id),
		index("payroll_variable_input_org_period_idx").on(
			t.organizationId,
			t.periodId,
		),
		uniqueIndex("payroll_variable_input_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_variable_input_org_source_uidx").on(
			t.organizationId,
			t.sourceType,
			t.sourceId,
		),
		uniqueIndex("payroll_variable_input_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_variable_input_org_pay_group_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.periodId],
			foreignColumns: [payrollPeriod.organizationId, payrollPeriod.id],
			name: "payroll_variable_input_org_period_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.earningRuleId],
			foreignColumns: [
				payrollEarningRule.organizationId,
				payrollEarningRule.id,
			],
			name: "payroll_variable_input_org_earning_rule_fk",
		}),
		check(
			"payroll_variable_input_status_check",
			sql`${t.status} IN ('accepted', 'superseded', 'cancelled')`,
		),
		check(
			"payroll_variable_input_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);
/** Per-employee calculation outcome for a payroll run. */
export const payrollRunEmployee = pgTable(
	"payroll_run_employee",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		employeeId: text("employee_id").notNull(),
		assignmentId: uuid("assignment_id"),
		currencyCode: text("currency_code").notNull(),
		gross: numeric("gross", { precision: 24, scale: 12 }).notNull(),
		employeeDeductions: numeric("employee_deductions", {
			precision: 24,
			scale: 12,
		}).notNull(),
		employeeStatutory: numeric("employee_statutory", {
			precision: 24,
			scale: 12,
		}).notNull(),
		employerCost: numeric("employer_cost", {
			precision: 24,
			scale: 12,
		}).notNull(),
		net: numeric("net", { precision: 24, scale: 12 }).notNull(),
		snapshotJson: jsonb("snapshot_json").notNull(),
		snapshotHash: text("snapshot_hash").notNull(),
		calculationVersion: text("calculation_version").notNull(),
		status: text("status").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_run_employee_org_id_idx").on(t.organizationId, t.id),
		index("payroll_run_employee_org_run_idx").on(t.organizationId, t.runId),
		uniqueIndex("payroll_run_employee_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_run_employee_org_run_employee_uidx").on(
			t.organizationId,
			t.runId,
			t.employeeId,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_run_employee_org_run_fk",
		}),
		check(
			"payroll_run_employee_status_check",
			sql`${t.status} IN ('calculated', 'failed')`,
		),
	],
);

/** Normalized payroll result line with provenance. */
export const payrollResultLine = pgTable(
	"payroll_result_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		runEmployeeId: uuid("run_employee_id").notNull(),
		employeeId: text("employee_id").notNull(),
		lineKind: text("line_kind").notNull(),
		code: text("code").notNull(),
		ruleCode: text("rule_code").notNull(),
		ruleVersion: text("rule_version").notNull(),
		ruleKind: text("rule_kind").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		sourceType: text("source_type"),
		sourceId: text("source_id"),
		sequence: integer("sequence").notNull(),
		traceRef: text("trace_ref").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_result_line_org_id_idx").on(t.organizationId, t.id),
		index("payroll_result_line_org_run_idx").on(t.organizationId, t.runId),
		uniqueIndex("payroll_result_line_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_result_line_org_run_employee_sequence_uidx").on(
			t.organizationId,
			t.runId,
			t.employeeId,
			t.sequence,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_result_line_org_run_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.runEmployeeId],
			foreignColumns: [payrollRunEmployee.organizationId, payrollRunEmployee.id],
			name: "payroll_result_line_org_run_employee_fk",
		}),
		check(
			"payroll_result_line_kind_check",
			sql`${t.lineKind} IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution')`,
		),
		check(
			"payroll_result_line_rule_kind_check",
			sql`${t.ruleKind} IN ('earning', 'deduction', 'statutory', 'none')`,
		),
	],
);

/** Statutory calculation result per employee and rule. */
export const payrollStatutoryResult = pgTable(
	"payroll_statutory_result",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		runEmployeeId: uuid("run_employee_id").notNull(),
		employeeId: text("employee_id").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		ruleCode: text("rule_code").notNull(),
		ruleVersion: text("rule_version").notNull(),
		calculatorId: text("calculator_id").notNull(),
		baseAmount: numeric("base_amount", { precision: 24, scale: 12 }).notNull(),
		employeeAmount: numeric("employee_amount", {
			precision: 24,
			scale: 12,
		}).notNull(),
		employerAmount: numeric("employer_amount", {
			precision: 24,
			scale: 12,
		}).notNull(),
		currencyCode: text("currency_code").notNull(),
		configSnapshotJson: jsonb("config_snapshot_json").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_statutory_result_org_id_idx").on(t.organizationId, t.id),
		index("payroll_statutory_result_org_run_idx").on(
			t.organizationId,
			t.runId,
		),
		uniqueIndex("payroll_statutory_result_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_statutory_result_org_run_employee_rule_uidx").on(
			t.organizationId,
			t.runId,
			t.employeeId,
			t.ruleCode,
			t.ruleVersion,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_statutory_result_org_run_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.runEmployeeId],
			foreignColumns: [payrollRunEmployee.organizationId, payrollRunEmployee.id],
			name: "payroll_statutory_result_org_run_employee_fk",
		}),
	],
);
export const payrollPayslip = createErpScaffoldTable("payroll_payslip");
export const payrollAdjustment = createErpScaffoldTable("payroll_adjustment");
export const payrollReconciliation = createErpScaffoldTable(
	"payroll_reconciliation",
);
