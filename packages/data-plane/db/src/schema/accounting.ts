import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/** Accounting periods, journals, journal lines, ledger postings, CoA, ledger accounts, posting profiles, source links, exceptions. */

export const accountingPeriod = pgTable(
	"accounting_period",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		status: text("status").notNull().default("open"),
		startsOn: date("starts_on", { mode: "string" }).notNull(),
		endsOn: date("ends_on", { mode: "string" }).notNull(),
		softClosed: boolean("soft_closed").notNull().default(false),
		softClosedAt: timestamp("soft_closed_at", { withTimezone: true }),
		softClosedBy: text("soft_closed_by"),
		reopenReason: text("reopen_reason"),
		reopenedAt: timestamp("reopened_at", { withTimezone: true }),
		reopenedBy: text("reopened_by"),
		closeReason: text("close_reason"),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedBy: text("closed_by"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("accounting_period_org_id_idx").on(t.organizationId, t.id),
		index("accounting_period_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("accounting_period_org_code_uidx").on(t.organizationId, t.code),
	],
);

export const chartOfAccount = pgTable(
	"chart_of_account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("chart_of_account_org_code_uidx").on(t.organizationId, t.code),
		index("chart_of_account_org_id_idx").on(t.organizationId, t.id),
	],
);

export const ledgerAccount = pgTable(
	"ledger_account",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		chartOfAccountId: uuid("chart_of_account_id")
			.notNull()
			.references(() => chartOfAccount.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		accountType: text("account_type").notNull(),
		normalBalance: text("normal_balance").notNull(),
		isControl: boolean("is_control").notNull().default(false),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ledger_account_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		index("ledger_account_org_id_idx").on(t.organizationId, t.id),
		index("ledger_account_org_coa_idx").on(
			t.organizationId,
			t.chartOfAccountId,
		),
	],
);

export const accountRoleMapping = pgTable(
	"account_role_mapping",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		accountRole: text("account_role").notNull(),
		ledgerAccountId: uuid("ledger_account_id")
			.notNull()
			.references(() => ledgerAccount.id),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("account_role_mapping_org_role_uidx").on(
			t.organizationId,
			t.accountRole,
		),
		index("account_role_mapping_org_id_idx").on(t.organizationId, t.id),
	],
);

export const postingProfile = pgTable(
	"posting_profile",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		eventType: text("event_type").notNull(),
		versionNumber: integer("version_number").notNull().default(1),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("posting_profile_org_code_ver_uidx").on(
			t.organizationId,
			t.code,
			t.versionNumber,
		),
		index("posting_profile_org_id_idx").on(t.organizationId, t.id),
	],
);

export const postingProfileLine = pgTable(
	"posting_profile_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		postingProfileId: uuid("posting_profile_id")
			.notNull()
			.references(() => postingProfile.id),
		lineNo: integer("line_no").notNull(),
		side: text("side").notNull(),
		accountRole: text("account_role").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("posting_profile_line_org_profile_line_uidx").on(
			t.organizationId,
			t.postingProfileId,
			t.lineNo,
		),
		index("posting_profile_line_org_id_idx").on(t.organizationId, t.id),
	],
);

export const journal = pgTable(
	"journal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		status: text("status").notNull().default("draft"),
		journalType: text("journal_type").notNull().default("manual"),
		periodId: uuid("period_id").references(() => accountingPeriod.id),
		currencyCode: text("currency_code").notNull(),
		description: text("description"),
		reversalOfJournalId: uuid("reversal_of_journal_id"),
		reversedByJournalId: uuid("reversed_by_journal_id"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true }),
		postedBy: text("posted_by"),
		reversedAt: timestamp("reversed_at", { withTimezone: true }),
		reversedBy: text("reversed_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("journal_org_id_idx").on(t.organizationId, t.id),
		index("journal_org_status_idx").on(t.organizationId, t.status),
		index("journal_org_period_idx").on(t.organizationId, t.periodId),
		uniqueIndex("journal_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
	],
);

export const journalLine = pgTable(
	"journal_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		journalId: uuid("journal_id")
			.notNull()
			.references(() => journal.id),
		lineNo: integer("line_no").notNull(),
		accountCode: text("account_code").notNull(),
		accountName: text("account_name"),
		ledgerAccountId: uuid("ledger_account_id").references(
			() => ledgerAccount.id,
		),
		debitAmount: text("debit_amount").notNull().default("0"),
		creditAmount: text("credit_amount").notNull().default("0"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("journal_line_org_id_idx").on(t.organizationId, t.id),
		index("journal_line_org_journal_idx").on(t.organizationId, t.journalId),
		index("journal_line_org_account_idx").on(t.organizationId, t.accountCode),
		uniqueIndex("journal_line_org_journal_line_no_uidx").on(
			t.organizationId,
			t.journalId,
			t.lineNo,
		),
	],
);

export const ledgerPosting = pgTable(
	"ledger_posting",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		journalId: uuid("journal_id")
			.notNull()
			.references(() => journal.id),
		journalLineId: uuid("journal_line_id")
			.notNull()
			.references(() => journalLine.id),
		accountCode: text("account_code").notNull(),
		ledgerAccountId: uuid("ledger_account_id").references(
			() => ledgerAccount.id,
		),
		debitAmount: text("debit_amount").notNull(),
		creditAmount: text("credit_amount").notNull(),
		postedAt: timestamp("posted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		periodId: uuid("period_id").references(() => accountingPeriod.id),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ledger_posting_org_id_idx").on(t.organizationId, t.id),
		index("ledger_posting_org_journal_idx").on(t.organizationId, t.journalId),
		index("ledger_posting_org_line_idx").on(t.organizationId, t.journalLineId),
		index("ledger_posting_org_account_idx").on(t.organizationId, t.accountCode),
		index("ledger_posting_org_period_idx").on(t.organizationId, t.periodId),
	],
);

export const sourcePostingLink = pgTable(
	"source_posting_link",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		sourceModule: text("source_module").notNull(),
		sourceAggregateId: text("source_aggregate_id").notNull(),
		sourceEventId: text("source_event_id").notNull(),
		sourceEventVersion: integer("source_event_version").notNull(),
		postingRuleId: uuid("posting_rule_id").notNull(),
		postingRuleVersion: integer("posting_rule_version").notNull(),
		journalId: uuid("journal_id")
			.notNull()
			.references(() => journal.id),
		causationId: text("causation_id"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("source_posting_link_idempotency_uidx").on(
			t.organizationId,
			t.sourceModule,
			t.sourceAggregateId,
			t.sourceEventId,
			t.sourceEventVersion,
			t.postingRuleVersion,
		),
		index("source_posting_link_org_id_idx").on(t.organizationId, t.id),
		index("source_posting_link_org_journal_idx").on(
			t.organizationId,
			t.journalId,
		),
	],
);

export const financialPostingException = pgTable(
	"financial_posting_exception",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		sourceModule: text("source_module").notNull(),
		sourceAggregateId: text("source_aggregate_id").notNull(),
		sourceEventId: text("source_event_id").notNull(),
		sourceEventVersion: integer("source_event_version").notNull(),
		postingRuleCode: text("posting_rule_code"),
		reasonCode: text("reason_code").notNull(),
		message: text("message").notNull(),
		status: text("status").notNull().default("open"),
		resolutionNote: text("resolution_note"),
		resolvedBy: text("resolved_by"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		payload: jsonb("payload"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("financial_posting_exception_org_id_idx").on(t.organizationId, t.id),
		index("financial_posting_exception_org_status_idx").on(
			t.organizationId,
			t.status,
		),
	],
);
