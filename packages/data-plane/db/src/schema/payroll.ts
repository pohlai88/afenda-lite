import { sql } from "drizzle-orm";
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
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

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
		unique("payroll_calendar_org_id_uidx").on(t.organizationId, t.id),
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
		unique("payroll_pay_group_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_pay_group_org_code_uidx").on(t.organizationId, t.code),
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
		unique("payroll_period_org_id_uidx").on(t.organizationId, t.id),
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
			sql`${t.status} IN ('open', 'inputs_locked', 'closed')`,
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
		unique("payroll_earning_rule_org_id_uidx").on(t.organizationId, t.id),
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
		unique("payroll_deduction_rule_org_id_uidx").on(t.organizationId, t.id),
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
		reversalReasonCode: text("reversal_reason_code"),
		reversalIdempotencyKey: text("reversal_idempotency_key"),
		reversalRequestFingerprint: text("reversal_request_fingerprint"),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_run_org_id_idx").on(t.organizationId, t.id),
		index("payroll_run_org_status_idx").on(t.organizationId, t.status),
		index("payroll_run_org_pay_group_idx").on(t.organizationId, t.payGroupId),
		index("payroll_run_org_period_idx").on(t.organizationId, t.periodId),
		unique("payroll_run_org_id_uidx").on(t.organizationId, t.id),
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
		uniqueIndex("payroll_run_org_reversal_idempotency_uidx")
			.on(t.organizationId, t.reversalIdempotencyKey)
			.where(sql`${t.reversalIdempotencyKey} IS NOT NULL`),
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
		check(
			"payroll_run_reversal_evidence_check",
			sql`(${t.status} = 'reversed' AND ${t.reversalReasonCode} IS NOT NULL AND ${t.reversalIdempotencyKey} IS NOT NULL AND ${t.reversalRequestFingerprint} IS NOT NULL) OR (${t.status} <> 'reversed' AND ${t.reversalReasonCode} IS NULL AND ${t.reversalIdempotencyKey} IS NULL AND ${t.reversalRequestFingerprint} IS NULL)`,
		),
		check(
			"payroll_run_reversal_reason_code_check",
			sql`${t.reversalReasonCode} IS NULL OR ${t.reversalReasonCode} IN ('calculation_correction', 'employee_data_correction', 'statutory_correction', 'payment_correction', 'accounting_correction', 'operational_correction')`,
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
		index("payroll_employee_assignment_org_id_idx").on(t.organizationId, t.id),
		index("payroll_employee_assignment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		unique("payroll_employee_assignment_org_id_uidx").on(
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
		unique("payroll_run_employee_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_run_employee_org_id_run_employee_uidx").on(
			t.organizationId,
			t.id,
			t.runId,
			t.employeeId,
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
		uniqueIndex("payroll_result_line_org_id_uidx").on(t.organizationId, t.id),
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
			foreignColumns: [
				payrollRunEmployee.organizationId,
				payrollRunEmployee.id,
			],
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
		index("payroll_statutory_result_org_run_idx").on(t.organizationId, t.runId),
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
			foreignColumns: [
				payrollRunEmployee.organizationId,
				payrollRunEmployee.id,
			],
			name: "payroll_statutory_result_org_run_employee_fk",
		}),
	],
);
/** Immutable publication metadata for a versioned employee payslip view. */
export const payrollPayslip = pgTable(
	"payroll_payslip",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		runEmployeeId: uuid("run_employee_id").notNull(),
		employeeId: text("employee_id").notNull(),
		viewVersion: integer("view_version").notNull(),
		contentHash: text("content_hash"),
		storageKey: text("storage_key"),
		status: text("status").notNull(),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		publishedBy: text("published_by"),
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_payslip_org_id_idx").on(t.organizationId, t.id),
		index("payroll_payslip_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		unique("payroll_payslip_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_payslip_org_run_employee_version_uidx").on(
			t.organizationId,
			t.runEmployeeId,
			t.viewVersion,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_payslip_org_run_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.runEmployeeId, t.runId, t.employeeId],
			foreignColumns: [
				payrollRunEmployee.organizationId,
				payrollRunEmployee.id,
				payrollRunEmployee.runId,
				payrollRunEmployee.employeeId,
			],
			name: "payroll_payslip_org_run_employee_lineage_fk",
		}),
		check(
			"payroll_payslip_status_check",
			sql`${t.status} IN ('pending', 'generated', 'published', 'superseded')`,
		),
	],
);

/** Compensating evidence linked to the immutable original payroll result. */
export const payrollAdjustment = pgTable(
	"payroll_adjustment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		originalRunId: uuid("original_run_id").notNull(),
		reversalRunId: uuid("reversal_run_id"),
		originalRunEmployeeId: uuid("original_run_employee_id"),
		adjustmentType: text("adjustment_type").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		reason: text("reason").notNull(),
		...payrollIdempotencyColumns,
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_adjustment_org_id_idx").on(t.organizationId, t.id),
		index("payroll_adjustment_org_original_run_idx").on(
			t.organizationId,
			t.originalRunId,
		),
		unique("payroll_adjustment_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_adjustment_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.originalRunId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_adjustment_org_original_run_fk",
		}),
		check(
			"payroll_adjustment_type_check",
			sql`${t.adjustmentType} IN ('reversal', 'adjustment')`,
		),
	],
);

/** Downstream payment/accounting reconciliation with explicit discrepancy state. */
export const payrollReconciliation = pgTable(
	"payroll_reconciliation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		runId: uuid("run_id").notNull(),
		kind: text("kind").notNull(),
		downstreamReference: text("downstream_reference").notNull(),
		expectedAmount: numeric("expected_amount", {
			precision: 24,
			scale: 12,
		}).notNull(),
		actualAmount: numeric("actual_amount", {
			precision: 24,
			scale: 12,
		}).notNull(),
		toleranceAmount: numeric("tolerance_amount", {
			precision: 24,
			scale: 12,
		}).notNull(),
		currencyCode: text("currency_code").notNull(),
		status: text("status").notNull(),
		resolutionNote: text("resolution_note"),
		resolvedBy: text("resolved_by"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_reconciliation_org_id_idx").on(t.organizationId, t.id),
		index("payroll_reconciliation_org_run_idx").on(t.organizationId, t.runId),
		unique("payroll_reconciliation_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_reconciliation_org_downstream_uidx").on(
			t.organizationId,
			t.kind,
			t.downstreamReference,
		),
		uniqueIndex("payroll_reconciliation_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.runId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_reconciliation_org_run_fk",
		}),
		check(
			"payroll_reconciliation_kind_check",
			sql`${t.kind} IN ('payment', 'accounting')`,
		),
		check(
			"payroll_reconciliation_status_check",
			sql`${t.status} IN ('matched', 'discrepant', 'resolved')`,
		),
		check(
			"payroll_reconciliation_resolution_evidence_check",
			sql`(${t.status} = 'resolved' AND ${t.resolutionNote} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL AND ${t.resolvedAt} IS NOT NULL) OR (${t.status} <> 'resolved' AND ${t.resolutionNote} IS NULL AND ${t.resolvedBy} IS NULL AND ${t.resolvedAt} IS NULL)`,
		),
		check(
			"payroll_reconciliation_nonnegative_amounts_check",
			sql`${t.expectedAmount} >= 0 AND ${t.actualAmount} >= 0 AND ${t.toleranceAmount} >= 0`,
		),
	],
);

/**
 * Immutable accepted workforce handoff — the canonical Payroll ingress ledger.
 * The raw HR payload is sealed with its hash; corrections supersede, never
 * mutate. Runs read accepted records instead of pulling HR at calculation time.
 */
export const payrollAcceptedHandoff = pgTable(
	"payroll_accepted_handoff",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		employmentId: text("employment_id").notNull(),
		contractVersion: text("contract_version").notNull(),
		effectiveDate: date("effective_date").notNull(),
		periodStart: date("period_start"),
		periodEnd: date("period_end"),
		payload: jsonb("payload").notNull(),
		payloadHash: text("payload_hash").notNull(),
		status: text("status").notNull().default("accepted"),
		supersededByHandoffId: uuid("superseded_by_handoff_id"),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_accepted_handoff_org_id_idx").on(t.organizationId, t.id),
		index("payroll_accepted_handoff_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
			t.effectiveDate,
		),
		unique("payroll_accepted_handoff_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_accepted_handoff_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("payroll_accepted_handoff_org_active_identity_uidx")
			.on(
				t.organizationId,
				t.employeeId,
				t.effectiveDate,
				t.periodStart,
				t.periodEnd,
			)
			.where(sql`${t.status} = 'accepted'`),
		check(
			"payroll_accepted_handoff_status_check",
			sql`${t.status} IN ('accepted', 'superseded', 'deferred_to_next_period')`,
		),
		check(
			"payroll_accepted_handoff_supersession_check",
			sql`(${t.status} = 'superseded' AND ${t.supersededByHandoffId} IS NOT NULL) OR (${t.status} IN ('accepted', 'deferred_to_next_period') AND ${t.supersededByHandoffId} IS NULL)`,
		),
	],
);

/** Durable payroll batch job — calculation checkpoints, not HR bulk import. */
export const payrollJob = pgTable(
	"payroll_job",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		kind: text("kind").notNull(),
		status: text("status").notNull(),
		targetRunId: uuid("target_run_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		checkpointJson: jsonb("checkpoint_json").notNull(),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_job_org_id_idx").on(t.organizationId, t.id),
		index("payroll_job_org_status_idx").on(t.organizationId, t.status),
		index("payroll_job_org_run_idx").on(t.organizationId, t.targetRunId),
		unique("payroll_job_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_job_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check("payroll_job_kind_check", sql`${t.kind} IN ('calculate-run')`),
		check(
			"payroll_job_status_check",
			sql`${t.status} IN ('queued', 'running', 'completed', 'failed', 'dead_lettered')`,
		),
	],
);

export const payrollJobWorkItem = pgTable(
	"payroll_job_work_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id").notNull(),
		status: text("status").notNull(),
		attemptCount: integer("attempt_count").notNull().default(0),
		nextAttemptAt: timestamp("next_attempt_at", {
			withTimezone: true,
		}).notNull(),
		lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
		leaseOwner: text("lease_owner"),
		leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_job_work_item_org_id_idx").on(t.organizationId, t.id),
		index("payroll_job_work_item_org_job_idx").on(t.organizationId, t.jobId),
		index("payroll_job_work_item_org_due_idx").on(
			t.organizationId,
			t.status,
			t.nextAttemptAt,
		),
		unique("payroll_job_work_item_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_job_work_item_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.jobId],
			foreignColumns: [payrollJob.organizationId, payrollJob.id],
			name: "payroll_job_work_item_org_job_fk",
		}),
		check(
			"payroll_job_work_item_status_check",
			sql`${t.status} IN ('pending', 'processing', 'succeeded', 'dead_lettered')`,
		),
	],
);

export const payrollJobDeadLetter = pgTable(
	"payroll_job_dead_letter",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id").notNull(),
		workItemId: uuid("work_item_id").notNull(),
		errorCode: text("error_code").notNull(),
		errorMessage: text("error_message").notNull(),
		attemptCount: integer("attempt_count").notNull(),
		failedAt: timestamp("failed_at", { withTimezone: true }).notNull(),
		replayedByWorkItemId: uuid("replayed_by_work_item_id"),
	},
	(t) => [
		index("payroll_job_dead_letter_org_id_idx").on(t.organizationId, t.id),
		index("payroll_job_dead_letter_org_job_idx").on(t.organizationId, t.jobId),
		unique("payroll_job_dead_letter_org_id_uidx").on(t.organizationId, t.id),
		foreignKey({
			columns: [t.organizationId, t.jobId],
			foreignColumns: [payrollJob.organizationId, payrollJob.id],
			name: "payroll_job_dead_letter_org_job_fk",
		}),
	],
);

/** Deferred correction for a sealed period — bridging C3/D3 retro-pay. */
export const payrollRetroItem = pgTable(
	"payroll_retro_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		originPeriodId: uuid("origin_period_id").notNull(),
		originRunId: uuid("origin_run_id"),
		employeeId: text("employee_id").notNull(),
		status: text("status").notNull(),
		reason: text("reason").notNull(),
		correlationId: text("correlation_id").notNull(),
		correctionJson: jsonb("correction_json").notNull(),
		differenceJson: jsonb("difference_json"),
		targetPeriodId: uuid("target_period_id"),
		targetRunId: uuid("target_run_id"),
		appliedAt: timestamp("applied_at", { withTimezone: true }),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_retro_item_org_id_idx").on(t.organizationId, t.id),
		index("payroll_retro_item_org_status_idx").on(t.organizationId, t.status),
		index("payroll_retro_item_org_origin_period_idx").on(
			t.organizationId,
			t.originPeriodId,
		),
		index("payroll_retro_item_org_target_run_idx").on(
			t.organizationId,
			t.targetRunId,
		),
		unique("payroll_retro_item_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_retro_item_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		foreignKey({
			columns: [t.organizationId, t.originPeriodId],
			foreignColumns: [payrollPeriod.organizationId, payrollPeriod.id],
			name: "payroll_retro_item_org_origin_period_fk",
		}),
		check(
			"payroll_retro_item_status_check",
			sql`${t.status} IN ('queued', 'calculated', 'applied')`,
		),
		check(
			"payroll_retro_item_applied_shape_check",
			sql`(${t.status} <> 'applied') OR (${t.originRunId} IS NOT NULL AND ${t.targetPeriodId} IS NOT NULL AND ${t.targetRunId} IS NOT NULL AND ${t.appliedAt} IS NOT NULL AND ${t.differenceJson} IS NOT NULL)`,
		),
	],
);

/** Retro result line emitted into an open target run, labelled with its origin period. */
export const payrollRetroLine = pgTable(
	"payroll_retro_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		retroItemId: uuid("retro_item_id").notNull(),
		targetRunId: uuid("target_run_id").notNull(),
		originPeriodId: uuid("origin_period_id").notNull(),
		originRunId: uuid("origin_run_id").notNull(),
		employeeId: text("employee_id").notNull(),
		lineKind: text("line_kind").notNull(),
		code: text("code").notNull(),
		ruleCode: text("rule_code").notNull(),
		ruleVersion: text("rule_version").notNull(),
		ruleKind: text("rule_kind").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		sequence: integer("sequence").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_retro_line_org_id_idx").on(t.organizationId, t.id),
		index("payroll_retro_line_org_target_run_idx").on(
			t.organizationId,
			t.targetRunId,
		),
		unique("payroll_retro_line_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_retro_line_org_item_sequence_uidx").on(
			t.organizationId,
			t.retroItemId,
			t.sequence,
		),
		foreignKey({
			columns: [t.organizationId, t.retroItemId],
			foreignColumns: [payrollRetroItem.organizationId, payrollRetroItem.id],
			name: "payroll_retro_line_org_item_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.targetRunId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_retro_line_org_target_run_fk",
		}),
		check(
			"payroll_retro_line_kind_check",
			sql`${t.lineKind} IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution')`,
		),
		check(
			"payroll_retro_line_rule_kind_check",
			sql`${t.ruleKind} IN ('earning', 'deduction', 'statutory', 'none')`,
		),
	],
);

/** Termination pay capsule — bridging D4/C6 final settlement. */
export const payrollFinalSettlement = pgTable(
	"payroll_final_settlement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: text("employee_id").notNull(),
		terminationId: text("termination_id").notNull(),
		terminationEffectiveOn: date("termination_effective_on", {
			mode: "string",
		}).notNull(),
		periodId: uuid("period_id").notNull(),
		payGroupId: uuid("pay_group_id").notNull(),
		originRunId: uuid("origin_run_id"),
		status: text("status").notNull(),
		factsJson: jsonb("facts_json").notNull(),
		compensationSnapshotJson: jsonb("compensation_snapshot_json").notNull(),
		compensationSnapshotHash: text("compensation_snapshot_hash").notNull(),
		totalsJson: jsonb("totals_json"),
		statutoryEvidenceJson: jsonb("statutory_evidence_json"),
		clearanceRequiredReason: text("clearance_required_reason"),
		clearanceReason: text("clearance_reason"),
		clearanceBy: text("clearance_by"),
		clearanceAt: timestamp("clearance_at", { withTimezone: true }),
		calculatedBy: text("calculated_by"),
		calculatedAt: timestamp("calculated_at", { withTimezone: true }),
		finalizedBy: text("finalized_by"),
		finalizedAt: timestamp("finalized_at", { withTimezone: true }),
		correlationId: text("correlation_id").notNull(),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_final_settlement_org_id_idx").on(t.organizationId, t.id),
		index("payroll_final_settlement_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		index("payroll_final_settlement_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		unique("payroll_final_settlement_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_final_settlement_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("payroll_final_settlement_org_termination_uidx").on(
			t.organizationId,
			t.terminationId,
		),
		foreignKey({
			columns: [t.organizationId, t.periodId],
			foreignColumns: [payrollPeriod.organizationId, payrollPeriod.id],
			name: "payroll_final_settlement_org_period_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.payGroupId],
			foreignColumns: [payrollPayGroup.organizationId, payrollPayGroup.id],
			name: "payroll_final_settlement_org_pay_group_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.originRunId],
			foreignColumns: [payrollRun.organizationId, payrollRun.id],
			name: "payroll_final_settlement_org_origin_run_fk",
		}),
		check(
			"payroll_final_settlement_status_check",
			sql`${t.status} IN ('initiated', 'clearance_required', 'calculated', 'finalized')`,
		),
		check(
			"payroll_final_settlement_calculated_shape_check",
			sql`(${t.status} NOT IN ('calculated', 'finalized')) OR (${t.totalsJson} IS NOT NULL AND ${t.statutoryEvidenceJson} IS NOT NULL AND ${t.calculatedBy} IS NOT NULL AND ${t.calculatedAt} IS NOT NULL)`,
		),
		check(
			"payroll_final_settlement_finalized_shape_check",
			sql`(${t.status} <> 'finalized') OR (${t.finalizedBy} IS NOT NULL AND ${t.finalizedAt} IS NOT NULL)`,
		),
	],
);

/** Calculated final-settlement line sealed with the settlement case. */
export const payrollFinalSettlementLine = pgTable(
	"payroll_final_settlement_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		settlementId: uuid("settlement_id").notNull(),
		kind: text("kind").notNull(),
		code: text("code").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }).notNull(),
		currencyCode: text("currency_code").notNull(),
		sequence: integer("sequence").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_final_settlement_line_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("payroll_final_settlement_line_org_settlement_idx").on(
			t.organizationId,
			t.settlementId,
		),
		unique("payroll_final_settlement_line_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex(
			"payroll_final_settlement_line_org_settlement_sequence_uidx",
		).on(t.organizationId, t.settlementId, t.sequence),
		foreignKey({
			columns: [t.organizationId, t.settlementId],
			foreignColumns: [
				payrollFinalSettlement.organizationId,
				payrollFinalSettlement.id,
			],
			name: "payroll_final_settlement_line_org_settlement_fk",
		}),
		check(
			"payroll_final_settlement_line_kind_check",
			sql`${t.kind} IN ('prorated_base', 'leave_encashment', 'notice_pay', 'notice_in_lieu', 'recovery', 'employee_statutory', 'employer_statutory')`,
		),
	],
);

/** Snapshot-sealed statutory filing or annual statement artifact. */
export const payrollStatutoryFiling = pgTable(
	"payroll_statutory_filing",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		kind: text("kind").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		instrumentCode: text("instrument_code").notNull(),
		periodId: uuid("period_id"),
		taxYear: integer("tax_year").notNull(),
		employeeId: text("employee_id"),
		status: text("status").notNull(),
		sourceRunIdsJson: jsonb("source_run_ids_json").notNull(),
		totalsJson: jsonb("totals_json").notNull(),
		evidenceJson: jsonb("evidence_json"),
		sealedBy: text("sealed_by"),
		sealedAt: timestamp("sealed_at", { withTimezone: true }),
		correlationId: text("correlation_id").notNull(),
		...payrollIdempotencyColumns,
		...payrollAuditColumns,
	},
	(t) => [
		index("payroll_statutory_filing_org_id_idx").on(t.organizationId, t.id),
		index("payroll_statutory_filing_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		unique("payroll_statutory_filing_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("payroll_statutory_filing_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("payroll_statutory_filing_org_period_natural_uidx").on(
			t.organizationId,
			t.jurisdictionCode,
			t.instrumentCode,
			t.periodId,
		),
		uniqueIndex("payroll_statutory_filing_org_annual_natural_uidx").on(
			t.organizationId,
			t.jurisdictionCode,
			t.instrumentCode,
			t.taxYear,
			t.employeeId,
		),
		check(
			"payroll_statutory_filing_kind_check",
			sql`${t.kind} IN ('period_filing', 'annual_statement')`,
		),
		check(
			"payroll_statutory_filing_status_check",
			sql`${t.status} IN ('generated', 'sealed')`,
		),
		check(
			"payroll_statutory_filing_period_shape_check",
			sql`(${t.kind} <> 'period_filing') OR (${t.periodId} IS NOT NULL AND ${t.employeeId} IS NULL)`,
		),
		check(
			"payroll_statutory_filing_annual_shape_check",
			sql`(${t.kind} <> 'annual_statement') OR (${t.employeeId} IS NOT NULL AND ${t.periodId} IS NULL)`,
		),
		check(
			"payroll_statutory_filing_sealed_shape_check",
			sql`(${t.status} <> 'sealed') OR (${t.evidenceJson} IS NOT NULL AND ${t.sealedBy} IS NOT NULL AND ${t.sealedAt} IS NOT NULL)`,
		),
	],
);

/** Line sealed with a statutory filing artifact. */
export const payrollStatutoryFilingLine = pgTable(
	"payroll_statutory_filing_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		filingId: uuid("filing_id").notNull(),
		runId: uuid("run_id").notNull(),
		employeeId: text("employee_id").notNull(),
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
		sequence: integer("sequence").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("payroll_statutory_filing_line_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("payroll_statutory_filing_line_org_filing_idx").on(
			t.organizationId,
			t.filingId,
		),
		unique("payroll_statutory_filing_line_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("payroll_statutory_filing_line_org_filing_sequence_uidx").on(
			t.organizationId,
			t.filingId,
			t.sequence,
		),
		foreignKey({
			columns: [t.organizationId, t.filingId],
			foreignColumns: [
				payrollStatutoryFiling.organizationId,
				payrollStatutoryFiling.id,
			],
			name: "payroll_statutory_filing_line_org_filing_fk",
		}),
	],
);
