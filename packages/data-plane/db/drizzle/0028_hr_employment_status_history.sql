CREATE TABLE IF NOT EXISTS "hr_employment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"starts_on_snapshot" date NOT NULL,
	"ends_on_snapshot" date,
	"effective_on" date NOT NULL,
	"change_kind" text NOT NULL,
	"reason" text,
	"evidence_reference" text,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_employment_status_history_org_employment_effective_idx" ON "hr_employment_status_history" USING btree ("organization_id","employment_id","effective_on");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_employment_status_history_org_employee_effective_idx" ON "hr_employment_status_history" USING btree ("organization_id","employee_id","effective_on");
--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_change_kind_check" CHECK ("change_kind" IN ('create', 'lifecycle', 'correction'));
--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_to_status_check" CHECK ("to_status" IN ('active', 'notice', 'terminated'));
--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_effective_range_ck" CHECK ("ends_on" IS NULL OR "starts_on" <= "ends_on");
