ALTER TABLE "hr_performance_cycle" DROP CONSTRAINT IF EXISTS "hr_performance_cycle_status_check";--> statement-breakpoint
ALTER TABLE "hr_performance_cycle" ADD CONSTRAINT "hr_performance_cycle_status_check" CHECK ("hr_performance_cycle"."status" IN ('draft', 'published', 'open', 'closed', 'cancelled'));--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_review_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_cycle_review_period_kind_check" CHECK ("hr_performance_cycle_review_period"."kind" IN ('goal_setting', 'self_review', 'manager_review', 'calibration')),
	CONSTRAINT "hr_performance_cycle_review_period_range_check" CHECK ("hr_performance_cycle_review_period"."period_end" >= "hr_performance_cycle_review_period"."period_start")
);--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"min_tenure_days" integer,
	"allowed_employment_statuses" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_review_period" ADD CONSTRAINT "hr_performance_cycle_review_period_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_eligibility" ADD CONSTRAINT "hr_performance_cycle_eligibility_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_review_period_org_id_idx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_review_period_org_cycle_idx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_review_period_org_cycle_kind_uidx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","cycle_id","kind");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_eligibility_org_id_idx" ON "hr_performance_cycle_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_eligibility_org_cycle_uidx" ON "hr_performance_cycle_eligibility" USING btree ("organization_id","cycle_id");
