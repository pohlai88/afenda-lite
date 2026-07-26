ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "period_start" date;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "period_end" date;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "budget_total_amount" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "budget_currency_code" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "create_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "create_request_fingerprint" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD COLUMN "updated_by" text;--> statement-breakpoint
DELETE FROM "hr_compensation_review_cycle";--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "period_start" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "period_end" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "budget_total_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "budget_currency_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "create_idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ALTER COLUMN "updated_by" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_cycle_org_code_uidx" ON "hr_compensation_review_cycle" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_cycle_org_status_idx" ON "hr_compensation_review_cycle" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_cycle_org_create_idempotency_uidx" ON "hr_compensation_review_cycle" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD CONSTRAINT "hr_compensation_review_cycle_status_check" CHECK ("status" IN ('draft', 'open', 'closed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "hr_compensation_review_cycle" ADD CONSTRAINT "hr_compensation_review_cycle_period_range_check" CHECK ("period_end" >= "period_start");--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "cycle_id" uuid;--> statement-breakpoint
DELETE FROM "hr_compensation_review";--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_cycle_id_hr_compensation_review_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_compensation_review_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ALTER COLUMN "cycle_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_cycle_idx" ON "hr_compensation_review" USING btree ("organization_id","cycle_id");
