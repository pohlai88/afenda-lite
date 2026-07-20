CREATE TABLE IF NOT EXISTS "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"direction" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"counterparty_id" uuid,
	"original_payment_id" uuid,
	"currency_code" text NOT NULL,
	"amount" text NOT NULL,
	"reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_direction_check"
		CHECK ("direction" IN ('receipt', 'disbursement', 'refund', 'transfer')),
	CONSTRAINT "payment_status_check"
		CHECK ("status" IN ('draft', 'posted', 'reversed')),
	CONSTRAINT "payment_amount_positive_check" CHECK ("amount"::numeric > 0),
	CONSTRAINT "payment_original_fk"
		FOREIGN KEY ("original_payment_id") REFERENCES "payment"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_id" uuid NOT NULL REFERENCES "payment"("id"),
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"amount" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocation_target_type_check"
		CHECK ("target_type" IN ('receivable', 'payable')),
	CONSTRAINT "payment_allocation_amount_positive_check" CHECK ("amount"::numeric > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_reversal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_id" uuid NOT NULL REFERENCES "payment"("id"),
	"reason" text NOT NULL,
	"reversed_by" text NOT NULL,
	"reversed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_org_id_idx" ON "payment" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "payment_org_status_idx" ON "payment" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "payment_org_direction_idx" ON "payment" ("organization_id", "direction");
CREATE INDEX IF NOT EXISTS "payment_org_counterparty_idx" ON "payment" ("organization_id", "counterparty_id");
CREATE INDEX IF NOT EXISTS "payment_org_original_idx" ON "payment" ("organization_id", "original_payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_org_normalized_code_uidx" ON "payment" ("organization_id", "normalized_code");
CREATE INDEX IF NOT EXISTS "payment_allocation_org_id_idx" ON "payment_allocation" ("organization_id", "id");
CREATE INDEX IF NOT EXISTS "payment_allocation_org_payment_idx" ON "payment_allocation" ("organization_id", "payment_id");
CREATE INDEX IF NOT EXISTS "payment_allocation_org_target_idx" ON "payment_allocation" ("organization_id", "target_type", "target_id");
CREATE INDEX IF NOT EXISTS "payment_reversal_org_id_idx" ON "payment_reversal" ("organization_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_reversal_org_payment_uidx" ON "payment_reversal" ("organization_id", "payment_id");
