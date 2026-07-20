-- Receivables gap close: lifecycle, source lines, credit amount, receipt application instruction, idempotency.

ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "invoice_source" text DEFAULT 'manual' NOT NULL;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "delivery_id" uuid;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "invoice_date" timestamp with time zone;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "accounting_date" timestamp with time zone;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "payment_term_code" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "payment_term_description" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "manual_reason" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "closed_by" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "post_idempotency_key" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "cancel_idempotency_key" text;
ALTER TABLE "sales_invoice" ADD COLUMN IF NOT EXISTS "close_idempotency_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_invoice_org_create_idempotency_uidx"
	ON "sales_invoice" ("organization_id", "create_idempotency_key")
	WHERE "create_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoice_line" ADD COLUMN IF NOT EXISTS "sales_order_line_id" uuid;
ALTER TABLE "sales_invoice_line" ADD COLUMN IF NOT EXISTS "delivery_line_id" uuid;
ALTER TABLE "sales_invoice_line" ADD COLUMN IF NOT EXISTS "line_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "sales_credit_note" ADD COLUMN IF NOT EXISTS "amount" text;
ALTER TABLE "sales_credit_note" ADD COLUMN IF NOT EXISTS "issue_idempotency_key" text;
UPDATE "sales_credit_note" SET "amount" = '0' WHERE "amount" IS NULL;
ALTER TABLE "sales_credit_note" ALTER COLUMN "amount" SET DEFAULT '0';
ALTER TABLE "sales_credit_note" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_credit_note_org_issue_idempotency_uidx"
	ON "sales_credit_note" ("organization_id", "issue_idempotency_key")
	WHERE "issue_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD COLUMN IF NOT EXISTS "payment_application_instruction_id" uuid;
ALTER TABLE "customer_allocation" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "customer_allocation" ADD COLUMN IF NOT EXISTS "apply_idempotency_key" text;
ALTER TABLE "customer_allocation" ADD COLUMN IF NOT EXISTS "reversed_at" timestamp with time zone;
ALTER TABLE "customer_allocation" ADD COLUMN IF NOT EXISTS "reversed_by" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_allocation_org_instruction_active_uidx"
	ON "customer_allocation" ("organization_id", "payment_application_instruction_id")
	WHERE "payment_application_instruction_id" IS NOT NULL AND "status" = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_allocation_org_apply_idempotency_uidx"
	ON "customer_allocation" ("organization_id", "apply_idempotency_key")
	WHERE "apply_idempotency_key" IS NOT NULL;
