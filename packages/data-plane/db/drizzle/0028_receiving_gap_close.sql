-- Receiving E2E gap close: reverse links, qty semantics, inventory application,
-- discrepancy status, command idempotency.
ALTER TABLE "goods_receipt"
	ADD COLUMN IF NOT EXISTS "reverses_receipt_id" uuid,
	ADD COLUMN IF NOT EXISTS "reversed_by_receipt_id" uuid,
	ADD COLUMN IF NOT EXISTS "reverse_reason" text,
	ADD COLUMN IF NOT EXISTS "inventory_application_status" text DEFAULT 'not_applicable',
	ADD COLUMN IF NOT EXISTS "inventory_movement_id" uuid,
	ADD COLUMN IF NOT EXISTS "inventory_application_error" text,
	ADD COLUMN IF NOT EXISTS "create_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "post_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "cancel_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "reverse_idempotency_key" text;
--> statement-breakpoint
UPDATE "goods_receipt"
SET "inventory_application_status" = CASE
	WHEN "status" = 'posted' AND "inventory_application_status" IS NULL THEN 'pending'
	ELSE COALESCE("inventory_application_status", 'not_applicable')
END
WHERE "inventory_application_status" IS NULL
	OR ("status" = 'posted' AND "inventory_application_status" = 'not_applicable'
		AND "inventory_movement_id" IS NULL);
--> statement-breakpoint
ALTER TABLE "goods_receipt"
	ALTER COLUMN "inventory_application_status" SET DEFAULT 'not_applicable',
	ALTER COLUMN "inventory_application_status" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'goods_receipt_reverses_receipt_id_fk'
	) THEN
		ALTER TABLE "goods_receipt"
			ADD CONSTRAINT "goods_receipt_reverses_receipt_id_fk"
			FOREIGN KEY ("reverses_receipt_id")
			REFERENCES "public"."goods_receipt"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'goods_receipt_reversed_by_receipt_id_fk'
	) THEN
		ALTER TABLE "goods_receipt"
			ADD CONSTRAINT "goods_receipt_reversed_by_receipt_id_fk"
			FOREIGN KEY ("reversed_by_receipt_id")
			REFERENCES "public"."goods_receipt"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_org_create_idem_uidx"
	ON "goods_receipt" ("organization_id", "create_idempotency_key")
	WHERE "create_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_org_post_idem_uidx"
	ON "goods_receipt" ("organization_id", "post_idempotency_key")
	WHERE "post_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_org_cancel_idem_uidx"
	ON "goods_receipt" ("organization_id", "cancel_idempotency_key")
	WHERE "cancel_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_org_reverse_idem_uidx"
	ON "goods_receipt" ("organization_id", "reverse_idempotency_key")
	WHERE "reverse_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line"
	ADD COLUMN IF NOT EXISTS "quantity_expected" text,
	ADD COLUMN IF NOT EXISTS "quantity_accepted" text,
	ADD COLUMN IF NOT EXISTS "quantity_rejected" text DEFAULT '0',
	ADD COLUMN IF NOT EXISTS "quantity_damaged" text DEFAULT '0',
	ADD COLUMN IF NOT EXISTS "line_idempotency_key" text;
--> statement-breakpoint
UPDATE "goods_receipt_line"
SET
	"quantity_expected" = COALESCE("quantity_expected", "quantity_ordered"),
	"quantity_accepted" = COALESCE("quantity_accepted", "quantity_received"),
	"quantity_rejected" = COALESCE("quantity_rejected", '0'),
	"quantity_damaged" = COALESCE("quantity_damaged", '0')
WHERE "quantity_accepted" IS NULL
	OR "quantity_rejected" IS NULL
	OR "quantity_damaged" IS NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line"
	ALTER COLUMN "quantity_accepted" SET NOT NULL,
	ALTER COLUMN "quantity_rejected" SET NOT NULL,
	ALTER COLUMN "quantity_damaged" SET NOT NULL,
	ALTER COLUMN "quantity_rejected" DROP DEFAULT,
	ALTER COLUMN "quantity_damaged" DROP DEFAULT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_line_org_line_idem_uidx"
	ON "goods_receipt_line" ("organization_id", "line_idempotency_key")
	WHERE "line_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "receiving_discrepancy"
	ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open',
	ADD COLUMN IF NOT EXISTS "resolution" text,
	ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "resolved_by" text,
	ADD COLUMN IF NOT EXISTS "record_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "resolve_idempotency_key" text;
--> statement-breakpoint
UPDATE "receiving_discrepancy"
SET "status" = COALESCE("status", 'open')
WHERE "status" IS NULL;
--> statement-breakpoint
ALTER TABLE "receiving_discrepancy"
	ALTER COLUMN "status" SET NOT NULL,
	ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receiving_discrepancy_org_record_idem_uidx"
	ON "receiving_discrepancy" ("organization_id", "record_idempotency_key")
	WHERE "record_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receiving_discrepancy_org_resolve_idem_uidx"
	ON "receiving_discrepancy" ("organization_id", "resolve_idempotency_key")
	WHERE "resolve_idempotency_key" IS NOT NULL;
