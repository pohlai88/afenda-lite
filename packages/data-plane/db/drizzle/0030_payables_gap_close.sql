-- Payables gap close: allocation instruction/idempotency, reverse status, match evidence, credit amount/lines.

ALTER TABLE "supplier_allocation" ADD COLUMN IF NOT EXISTS "payment_application_instruction_id" uuid;
ALTER TABLE "supplier_allocation" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "supplier_allocation" ADD COLUMN IF NOT EXISTS "apply_idempotency_key" text;
ALTER TABLE "supplier_allocation" ADD COLUMN IF NOT EXISTS "reversed_at" timestamp with time zone;
ALTER TABLE "supplier_allocation" ADD COLUMN IF NOT EXISTS "reversed_by" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_allocation_org_instruction_active_uidx"
	ON "supplier_allocation" ("organization_id", "payment_application_instruction_id")
	WHERE "payment_application_instruction_id" IS NOT NULL AND "status" = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_allocation_org_apply_idempotency_uidx"
	ON "supplier_allocation" ("organization_id", "apply_idempotency_key")
	WHERE "apply_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD COLUMN IF NOT EXISTS "evidence_json" text;
ALTER TABLE "three_way_match_result" ADD COLUMN IF NOT EXISTS "po_evidence_version" integer;
ALTER TABLE "three_way_match_result" ADD COLUMN IF NOT EXISTS "gr_evidence_version" integer;
ALTER TABLE "three_way_match_result" ADD COLUMN IF NOT EXISTS "matched_at" timestamp with time zone;
ALTER TABLE "three_way_match_result" ADD COLUMN IF NOT EXISTS "matched_by" text;
--> statement-breakpoint
ALTER TABLE "supplier_credit_note" ADD COLUMN IF NOT EXISTS "amount" text;
UPDATE "supplier_credit_note" SET "amount" = '0' WHERE "amount" IS NULL;
ALTER TABLE "supplier_credit_note" ALTER COLUMN "amount" SET DEFAULT '0';
ALTER TABLE "supplier_credit_note" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_credit_note_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text NOT NULL,
	"line_amount" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_credit_note_line_org_id_idx"
	ON "supplier_credit_note_line" ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplier_credit_note_line_org_credit_note_idx"
	ON "supplier_credit_note_line" ("organization_id", "credit_note_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_credit_note_line_org_credit_note_line_no_uidx"
	ON "supplier_credit_note_line" ("organization_id", "credit_note_id", "line_no");
