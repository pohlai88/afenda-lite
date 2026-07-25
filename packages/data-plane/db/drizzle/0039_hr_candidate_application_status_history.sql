CREATE TABLE IF NOT EXISTS "hr_candidate_application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"change_kind" text NOT NULL,
	"reason" text,
	"reason_code" text,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_candidate_id_hr_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hr_candidate"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_candidate_application_status_history_org_application_created_idx" ON "hr_candidate_application_status_history" USING btree ("organization_id","application_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_candidate_application_status_history_org_candidate_idx" ON "hr_candidate_application_status_history" USING btree ("organization_id","candidate_id");
--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_change_kind_check" CHECK ("change_kind" IN ('create', 'lifecycle'));
--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_to_status_check" CHECK ("to_status" IN ('submitted', 'in_review', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn'));
