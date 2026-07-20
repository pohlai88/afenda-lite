CREATE TABLE IF NOT EXISTS "accounting_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounting_period_status_check" CHECK ("status" IN ('open', 'closed')),
	CONSTRAINT "accounting_period_date_range_check" CHECK ("starts_on" <= "ends_on")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"period_id" uuid REFERENCES "accounting_period"("id"),
	"currency_code" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_status_check" CHECK ("status" IN ('draft', 'posted', 'reversed'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"journal_id" uuid NOT NULL REFERENCES "journal"("id"),
	"line_no" integer NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text,
	"debit_amount" text DEFAULT '0' NOT NULL,
	"credit_amount" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_line_line_no_positive_check" CHECK ("line_no" > 0),
	CONSTRAINT "journal_line_debit_nonnegative_check" CHECK ("debit_amount"::numeric >= 0),
	CONSTRAINT "journal_line_credit_nonnegative_check" CHECK ("credit_amount"::numeric >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_posting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"journal_id" uuid NOT NULL REFERENCES "journal"("id"),
	"journal_line_id" uuid NOT NULL REFERENCES "journal_line"("id"),
	"account_code" text NOT NULL,
	"debit_amount" text NOT NULL,
	"credit_amount" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_id" uuid REFERENCES "accounting_period"("id"),
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_posting_debit_nonnegative_check" CHECK ("debit_amount"::numeric >= 0),
	CONSTRAINT "ledger_posting_credit_nonnegative_check" CHECK ("credit_amount"::numeric >= 0),
	CONSTRAINT "ledger_posting_amount_present_check"
		CHECK ("debit_amount"::numeric > 0 OR "credit_amount"::numeric > 0),
	CONSTRAINT "ledger_posting_single_side_check"
		CHECK (NOT ("debit_amount"::numeric > 0 AND "credit_amount"::numeric > 0))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounting_period_org_id_idx" ON "accounting_period" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "accounting_period_org_status_idx" ON "accounting_period" ("organization_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_period_org_code_uidx" ON "accounting_period" ("organization_id", "code");
CREATE INDEX IF NOT EXISTS "journal_org_id_idx" ON "journal" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "journal_org_status_idx" ON "journal" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "journal_org_period_idx" ON "journal" ("organization_id", "period_id");
CREATE UNIQUE INDEX IF NOT EXISTS "journal_org_normalized_code_uidx" ON "journal" ("organization_id", "normalized_code");
CREATE INDEX IF NOT EXISTS "journal_line_org_id_idx" ON "journal_line" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "journal_line_org_journal_idx" ON "journal_line" ("organization_id", "journal_id");
CREATE INDEX IF NOT EXISTS "journal_line_org_account_idx" ON "journal_line" ("organization_id", "account_code");
CREATE UNIQUE INDEX IF NOT EXISTS "journal_line_org_journal_line_no_uidx" ON "journal_line" ("organization_id", "journal_id", "line_no");
CREATE INDEX IF NOT EXISTS "ledger_posting_org_id_idx" ON "ledger_posting" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "ledger_posting_org_journal_idx" ON "ledger_posting" ("organization_id", "journal_id");
CREATE INDEX IF NOT EXISTS "ledger_posting_org_line_idx" ON "ledger_posting" ("organization_id", "journal_line_id");
CREATE INDEX IF NOT EXISTS "ledger_posting_org_account_idx" ON "ledger_posting" ("organization_id", "account_code");
CREATE INDEX IF NOT EXISTS "ledger_posting_org_period_idx" ON "ledger_posting" ("organization_id", "period_id");
