ALTER TABLE "stock_movement"
	ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual_adjustment',
	ADD COLUMN IF NOT EXISTS "reverses_movement_id" uuid,
	ADD COLUMN IF NOT EXISTS "adjustment_reason_code" text,
	ADD COLUMN IF NOT EXISTS "adjustment_note" text,
	ADD COLUMN IF NOT EXISTS "source_module" text,
	ADD COLUMN IF NOT EXISTS "source_aggregate_id" text,
	ADD COLUMN IF NOT EXISTS "source_event_id" text,
	ADD COLUMN IF NOT EXISTS "source_event_version" integer,
	ADD COLUMN IF NOT EXISTS "source_line_id" text,
	ADD COLUMN IF NOT EXISTS "create_idempotency_key" text DEFAULT gen_random_uuid()::text,
	ADD COLUMN IF NOT EXISTS "post_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "cancel_idempotency_key" text,
	ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "cancelled_by" text;
--> statement-breakpoint
UPDATE "stock_movement"
SET
	"source" = COALESCE("source", 'manual_adjustment'),
	"create_idempotency_key" = COALESCE("create_idempotency_key", gen_random_uuid()::text)
WHERE "source" IS NULL
	OR "create_idempotency_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "stock_movement"
	ALTER COLUMN "source" SET NOT NULL,
	ALTER COLUMN "create_idempotency_key" SET NOT NULL,
	ALTER COLUMN "source" DROP DEFAULT,
	ALTER COLUMN "create_idempotency_key" DROP DEFAULT;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'stock_movement_reverses_movement_id_stock_movement_id_fk'
	) THEN
		ALTER TABLE "stock_movement"
			ADD CONSTRAINT "stock_movement_reverses_movement_id_stock_movement_id_fk"
			FOREIGN KEY ("reverses_movement_id")
			REFERENCES "public"."stock_movement"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "stock_movement_line"
	ADD COLUMN IF NOT EXISTS "line_idempotency_key" text DEFAULT gen_random_uuid()::text;
--> statement-breakpoint
UPDATE "stock_movement_line"
SET "line_idempotency_key" = COALESCE("line_idempotency_key", gen_random_uuid()::text)
WHERE "line_idempotency_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "stock_movement_line"
	ALTER COLUMN "line_idempotency_key" SET NOT NULL,
	ALTER COLUMN "line_idempotency_key" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "stock_balance"
	ADD COLUMN IF NOT EXISTS "base_uom_id" uuid,
	ADD COLUMN IF NOT EXISTS "base_uom_code" text;
--> statement-breakpoint
ALTER TABLE "stock_ledger_entry"
	ADD COLUMN IF NOT EXISTS "ledger_sequence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH sequenced AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "organization_id"
			ORDER BY "created_at", "id"
		) AS "next_ledger_sequence"
	FROM "stock_ledger_entry"
)
UPDATE "stock_ledger_entry" AS sle
SET "ledger_sequence" = sequenced."next_ledger_sequence"
FROM sequenced
WHERE sle."id" = sequenced."id";
--> statement-breakpoint
ALTER TABLE "stock_reservation"
	ADD COLUMN IF NOT EXISTS "consumed_quantity" numeric(24, 12) DEFAULT '0' NOT NULL,
	ADD COLUMN IF NOT EXISTS "create_idempotency_key" text DEFAULT gen_random_uuid()::text,
	ADD COLUMN IF NOT EXISTS "release_idempotency_key" text;
--> statement-breakpoint
UPDATE "stock_reservation"
SET
	"consumed_quantity" = COALESCE("consumed_quantity", '0'),
	"create_idempotency_key" = COALESCE("create_idempotency_key", gen_random_uuid()::text)
WHERE "consumed_quantity" IS NULL
	OR "create_idempotency_key" IS NULL;
--> statement-breakpoint
ALTER TABLE "stock_reservation"
	ALTER COLUMN "consumed_quantity" SET NOT NULL,
	ALTER COLUMN "create_idempotency_key" SET NOT NULL,
	ALTER COLUMN "create_idempotency_key" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "stock_reservation"
	DROP CONSTRAINT IF EXISTS "stock_reservation_source_movement_id_stock_movement_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_reservation"
	DROP CONSTRAINT IF EXISTS "stock_reservation_release_movement_id_stock_movement_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_reservation"
	DROP COLUMN IF EXISTS "source_movement_id",
	DROP COLUMN IF EXISTS "release_movement_id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movement_org_create_idempotency_uidx"
	ON "stock_movement" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movement_org_source_event_uidx"
	ON "stock_movement" USING btree ("organization_id","source_module","source_event_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movement_line_org_movement_idempotency_uidx"
	ON "stock_movement_line" USING btree ("organization_id","movement_id","line_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_ledger_entry_org_ledger_sequence_idx"
	ON "stock_ledger_entry" USING btree ("organization_id","ledger_sequence");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_reservation_org_create_idempotency_uidx"
	ON "stock_reservation" USING btree ("organization_id","create_idempotency_key");
