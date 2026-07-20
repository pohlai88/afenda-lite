-- Payments gap close: payment_account aggregate, application instructions, idempotency, transfer pairing.

CREATE TABLE IF NOT EXISTS "payment_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'cash' NOT NULL,
	"currency_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_account_kind_check"
		CHECK ("kind" IN ('bank', 'cash', 'gateway', 'clearing'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_account_org_id_idx"
	ON "payment_account" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_account_org_normalized_code_uidx"
	ON "payment_account" ("organization_id", "normalized_code");
--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "payment_account_id" uuid;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "purpose" text;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "counterparty_snapshot" text;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "transfer_group_id" uuid;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "linked_payment_id" uuid;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "refund_source" text;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "post_idempotency_key" text;
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "reverse_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "target_module" text;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "target_document_type" text;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "target_document_id" uuid;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "intended_amount" text;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "applied_amount" text DEFAULT '0';
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "currency_code" text;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "rejection_code" text;
ALTER TABLE "payment_allocation" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
-- Default payment accounts for orgs that already have payments (or orphan orgs with none).
INSERT INTO "payment_account" (
	"id", "organization_id", "code", "normalized_code", "name", "kind",
	"currency_code", "active", "created_by"
)
SELECT
	gen_random_uuid(),
	org.organization_id,
	'DEFAULT-CASH',
	'DEFAULT-CASH',
	'Default cash account',
	'cash',
	COALESCE(org.currency_code, 'USD'),
	true,
	'system:0025_payments_gap_close'
FROM (
	SELECT DISTINCT ON (p.organization_id)
		p.organization_id,
		p.currency_code
	FROM "payment" p
	ORDER BY p.organization_id, p.created_at ASC
) org
WHERE NOT EXISTS (
	SELECT 1 FROM "payment_account" a
	WHERE a.organization_id = org.organization_id
		AND a.normalized_code = 'DEFAULT-CASH'
);
--> statement-breakpoint
UPDATE "payment" p
SET
	"payment_account_id" = a.id,
	"purpose" = CASE p.direction
		WHEN 'receipt' THEN 'customer_receipt'
		WHEN 'disbursement' THEN 'supplier_disbursement'
		WHEN 'refund' THEN 'customer_refund'
		WHEN 'transfer' THEN 'internal_transfer'
		ELSE 'manual_receipt'
	END,
	"create_idempotency_key" = COALESCE(p.create_idempotency_key, p.id::text)
FROM "payment_account" a
WHERE a.organization_id = p.organization_id
	AND a.normalized_code = 'DEFAULT-CASH'
	AND (p.payment_account_id IS NULL OR p.purpose IS NULL OR p.create_idempotency_key IS NULL);
--> statement-breakpoint
-- Migrate legacy transfer direction into paired-transfer shape (receipt leg retained).
UPDATE "payment"
SET
	"direction" = 'receipt',
	"purpose" = 'internal_transfer'
WHERE "direction" = 'transfer';
--> statement-breakpoint
UPDATE "payment_allocation" a
SET
	"target_module" = CASE a.target_type
		WHEN 'receivable' THEN 'receivables'
		WHEN 'payable' THEN 'payables'
		ELSE COALESCE(a.target_module, 'receivables')
	END,
	"target_document_type" = CASE a.target_type
		WHEN 'receivable' THEN 'customer_invoice'
		WHEN 'payable' THEN 'supplier_invoice'
		ELSE COALESCE(a.target_document_type, 'customer_invoice')
	END,
	"target_document_id" = COALESCE(a.target_document_id, a.target_id),
	"intended_amount" = COALESCE(a.intended_amount, a.amount),
	"applied_amount" = COALESCE(a.applied_amount, '0'),
	"currency_code" = COALESCE(
		a.currency_code,
		(SELECT p.currency_code FROM "payment" p WHERE p.id = a.payment_id LIMIT 1),
		'USD'
	),
	"status" = COALESCE(a.status, 'pending'),
	"updated_at" = COALESCE(a.updated_at, now())
WHERE a.target_type IS NOT NULL
	OR a.target_module IS NULL
	OR a.intended_amount IS NULL
	OR a.currency_code IS NULL;
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_target_type_check";
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_amount_positive_check";
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP COLUMN IF EXISTS "target_type";
ALTER TABLE "payment_allocation" DROP COLUMN IF EXISTS "target_id";
ALTER TABLE "payment_allocation" DROP COLUMN IF EXISTS "amount";
--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "payment_account_id" SET NOT NULL;
ALTER TABLE "payment" ALTER COLUMN "purpose" SET NOT NULL;
ALTER TABLE "payment" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "target_module" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "target_document_type" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "target_document_id" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "intended_amount" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "applied_amount" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "currency_code" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "payment_allocation" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_direction_check";
ALTER TABLE "payment" ADD CONSTRAINT "payment_direction_check"
	CHECK ("direction" IN ('receipt', 'disbursement', 'refund'));
--> statement-breakpoint
ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_purpose_check";
ALTER TABLE "payment" ADD CONSTRAINT "payment_purpose_check"
	CHECK ("purpose" IN (
		'customer_receipt',
		'supplier_disbursement',
		'customer_refund',
		'supplier_refund_receipt',
		'internal_transfer',
		'manual_receipt',
		'manual_disbursement'
	));
--> statement-breakpoint
ALTER TABLE "payment" DROP CONSTRAINT IF EXISTS "payment_account_fk";
ALTER TABLE "payment" ADD CONSTRAINT "payment_account_fk"
	FOREIGN KEY ("payment_account_id") REFERENCES "payment_account"("id");
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_target_module_check";
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_target_module_check"
	CHECK ("target_module" IN ('receivables', 'payables'));
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_target_document_type_check";
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_target_document_type_check"
	CHECK ("target_document_type" IN (
		'customer_invoice',
		'customer_credit',
		'supplier_invoice',
		'supplier_credit'
	));
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_status_check";
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_status_check"
	CHECK ("status" IN (
		'pending',
		'applied',
		'partially_applied',
		'rejected',
		'reversed'
	));
--> statement-breakpoint
ALTER TABLE "payment_allocation" DROP CONSTRAINT IF EXISTS "payment_allocation_intended_positive_check";
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_intended_positive_check"
	CHECK ("intended_amount"::numeric > 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_org_account_idx"
	ON "payment" ("organization_id", "payment_account_id");
CREATE INDEX IF NOT EXISTS "payment_org_transfer_group_idx"
	ON "payment" ("organization_id", "transfer_group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_org_create_idempotency_uidx"
	ON "payment" ("organization_id", "create_idempotency_key");
CREATE INDEX IF NOT EXISTS "payment_allocation_org_target_document_idx"
	ON "payment_allocation" ("organization_id", "target_module", "target_document_id");
