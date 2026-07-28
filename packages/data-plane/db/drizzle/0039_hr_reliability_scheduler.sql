ALTER TABLE "hr_reliability_work_item" ADD COLUMN IF NOT EXISTS "target_type" text;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD COLUMN IF NOT EXISTS "target_id" text;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD COLUMN IF NOT EXISTS "acknowledgement_deadline_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD COLUMN IF NOT EXISTS "lease_owner" text;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD COLUMN IF NOT EXISTS "lease_expires_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "hr_reliability_work_item"
SET "target_type" = CASE "connector"
	WHEN 'payroll' THEN 'payroll_delivery'
	WHEN 'attendance' THEN 'connector_stream'
	ELSE 'organization'
END,
"target_id" = "id"::text
WHERE "target_type" IS NULL OR "target_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ALTER COLUMN "target_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ALTER COLUMN "target_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" DROP CONSTRAINT IF EXISTS "hr_reliability_work_item_status_check";
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD CONSTRAINT "hr_reliability_work_item_status_check" CHECK ("status" IN ('pending', 'processing', 'awaiting_acknowledgement', 'succeeded', 'dead_lettered'));
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD CONSTRAINT "hr_reliability_work_item_lease_check" CHECK (("status" = 'processing' AND "lease_owner" IS NOT NULL AND "lease_expires_at" IS NOT NULL) OR ("status" <> 'processing' AND "lease_owner" IS NULL AND "lease_expires_at" IS NULL));
--> statement-breakpoint
ALTER TABLE "hr_reliability_work_item" ADD CONSTRAINT "hr_reliability_work_item_ack_check" CHECK (("status" = 'awaiting_acknowledgement' AND "receipt_id" IS NOT NULL AND "acknowledgement_deadline_at" IS NOT NULL) OR ("status" <> 'awaiting_acknowledgement' AND "acknowledgement_deadline_at" IS NULL));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_reliability_work_item_status_due_global_idx" ON "hr_reliability_work_item" USING btree ("status", "next_attempt_at", "acknowledgement_deadline_at", "organization_id", "id");
--> statement-breakpoint
ALTER TABLE "hr_reliability_dead_letter" ADD COLUMN IF NOT EXISTS "target_type" text;
--> statement-breakpoint
ALTER TABLE "hr_reliability_dead_letter" ADD COLUMN IF NOT EXISTS "target_id" text;
--> statement-breakpoint
UPDATE "hr_reliability_dead_letter" AS dead
SET "target_type" = work."target_type", "target_id" = work."target_id"
FROM "hr_reliability_work_item" AS work
WHERE dead."organization_id" = work."organization_id"
	AND dead."work_item_id" = work."id"
	AND (dead."target_type" IS NULL OR dead."target_id" IS NULL);
--> statement-breakpoint
ALTER TABLE "hr_reliability_dead_letter" ALTER COLUMN "target_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_reliability_dead_letter" ALTER COLUMN "target_id" SET NOT NULL;
