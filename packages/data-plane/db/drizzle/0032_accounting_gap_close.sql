-- 0032: Accounting gap close — CoA, ledger accounts, posting profiles,
-- source posting links, financial exceptions, period lifecycle.

-- ── New tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "chart_of_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active', 'inactive')),
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "chart_of_account_org_code_uidx"
  ON "chart_of_account" ("organization_id", "code");
CREATE INDEX "chart_of_account_org_id_idx"
  ON "chart_of_account" ("organization_id", "id");

CREATE TABLE IF NOT EXISTS "ledger_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "chart_of_account_id" uuid NOT NULL REFERENCES "chart_of_account" ("id"),
  "code" text NOT NULL,
  "normalized_code" text NOT NULL,
  "name" text NOT NULL,
  "account_type" text NOT NULL
    CHECK ("account_type" IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  "normal_balance" text NOT NULL
    CHECK ("normal_balance" IN ('debit', 'credit')),
  "is_control" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active', 'inactive')),
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "ledger_account_org_normalized_code_uidx"
  ON "ledger_account" ("organization_id", "normalized_code");
CREATE INDEX "ledger_account_org_id_idx"
  ON "ledger_account" ("organization_id", "id");
CREATE INDEX "ledger_account_org_coa_idx"
  ON "ledger_account" ("organization_id", "chart_of_account_id");

CREATE TABLE IF NOT EXISTS "account_role_mapping" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "account_role" text NOT NULL,
  "ledger_account_id" uuid NOT NULL REFERENCES "ledger_account" ("id"),
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "account_role_mapping_org_role_uidx"
  ON "account_role_mapping" ("organization_id", "account_role");
CREATE INDEX "account_role_mapping_org_id_idx"
  ON "account_role_mapping" ("organization_id", "id");

CREATE TABLE IF NOT EXISTS "posting_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "code" text NOT NULL,
  "event_type" text NOT NULL,
  "version_number" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active', 'inactive')),
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "posting_profile_org_code_ver_uidx"
  ON "posting_profile" ("organization_id", "code", "version_number");
CREATE INDEX "posting_profile_org_id_idx"
  ON "posting_profile" ("organization_id", "id");

CREATE TABLE IF NOT EXISTS "posting_profile_line" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "posting_profile_id" uuid NOT NULL REFERENCES "posting_profile" ("id"),
  "line_no" integer NOT NULL,
  "side" text NOT NULL
    CHECK ("side" IN ('debit', 'credit')),
  "account_role" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "posting_profile_line_org_profile_line_uidx"
  ON "posting_profile_line" ("organization_id", "posting_profile_id", "line_no");
CREATE INDEX "posting_profile_line_org_id_idx"
  ON "posting_profile_line" ("organization_id", "id");

CREATE TABLE IF NOT EXISTS "source_posting_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "source_module" text NOT NULL,
  "source_aggregate_id" text NOT NULL,
  "source_event_id" text NOT NULL,
  "source_event_version" integer NOT NULL,
  "posting_rule_id" uuid NOT NULL,
  "posting_rule_version" integer NOT NULL,
  "journal_id" uuid NOT NULL REFERENCES "journal" ("id"),
  "causation_id" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "source_posting_link_idempotency_uidx"
  ON "source_posting_link" (
    "organization_id", "source_module", "source_aggregate_id",
    "source_event_id", "source_event_version", "posting_rule_version"
  );
CREATE INDEX "source_posting_link_org_id_idx"
  ON "source_posting_link" ("organization_id", "id");
CREATE INDEX "source_posting_link_org_journal_idx"
  ON "source_posting_link" ("organization_id", "journal_id");

CREATE TABLE IF NOT EXISTS "financial_posting_exception" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "source_module" text NOT NULL,
  "source_aggregate_id" text NOT NULL,
  "source_event_id" text NOT NULL,
  "source_event_version" integer NOT NULL,
  "posting_rule_code" text,
  "reason_code" text NOT NULL,
  "message" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open'
    CHECK ("status" IN ('open', 'resolved', 'retrying')),
  "resolution_note" text,
  "resolved_by" text,
  "resolved_at" timestamp with time zone,
  "payload" jsonb,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "financial_posting_exception_org_id_idx"
  ON "financial_posting_exception" ("organization_id", "id");
CREATE INDEX "financial_posting_exception_org_status_idx"
  ON "financial_posting_exception" ("organization_id", "status");

-- ── Alter accounting_period ──────────────────────────────────────────────────

ALTER TABLE "accounting_period" DROP CONSTRAINT IF EXISTS "accounting_period_status_check";

ALTER TABLE "accounting_period"
  ADD COLUMN IF NOT EXISTS "soft_closed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "soft_closed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "soft_closed_by" text,
  ADD COLUMN IF NOT EXISTS "reopen_reason" text,
  ADD COLUMN IF NOT EXISTS "reopened_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "reopened_by" text,
  ADD COLUMN IF NOT EXISTS "close_reason" text;

ALTER TABLE "accounting_period"
  ADD CONSTRAINT "accounting_period_status_check"
    CHECK ("status" IN ('open', 'soft_closed', 'closed'));

-- ── Alter journal ────────────────────────────────────────────────────────────

ALTER TABLE "journal"
  ADD COLUMN IF NOT EXISTS "journal_type" text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "reversal_of_journal_id" uuid,
  ADD COLUMN IF NOT EXISTS "reversed_by_journal_id" uuid;

ALTER TABLE "journal"
  ADD CONSTRAINT "journal_type_check"
    CHECK ("journal_type" IN (
      'manual', 'receivables', 'payables', 'payments',
      'inventory', 'opening_balance', 'adjustment', 'reversal', 'system'
    ));

-- ── Alter journal_line ───────────────────────────────────────────────────────

ALTER TABLE "journal_line"
  ADD COLUMN IF NOT EXISTS "ledger_account_id" uuid REFERENCES "ledger_account" ("id");

-- ── Alter ledger_posting ─────────────────────────────────────────────────────

ALTER TABLE "ledger_posting"
  ADD COLUMN IF NOT EXISTS "ledger_account_id" uuid REFERENCES "ledger_account" ("id");
