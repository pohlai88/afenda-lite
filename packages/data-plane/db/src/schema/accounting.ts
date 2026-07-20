import {
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/** Accounting periods, journals, journal lines, and ledger postings. */
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

export const journal = pgTable(
	"journal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		status: text("status").notNull().default("draft"),
		periodId: uuid("period_id").references(() => accountingPeriod.id),
		currencyCode: text("currency_code").notNull(),
		description: text("description"),
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
