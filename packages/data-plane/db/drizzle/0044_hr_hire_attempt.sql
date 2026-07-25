CREATE TABLE "hr_hire_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offer_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"current_step" text,
	"person_id" uuid,
	"employee_id" uuid,
	"employment_id" uuid,
	"worker_id" uuid,
	"assignment_id" uuid,
	"onboarding_case_id" uuid,
	"compensation_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_offer_id_hr_employment_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."hr_employment_offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_person_id_hr_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."hr_person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_worker_id_hr_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."hr_worker"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_hire_attempt_org_id_idx" ON "hr_hire_attempt" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_hire_attempt_org_idempotency_uidx" ON "hr_hire_attempt" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_hire_attempt_org_offer_open_uidx" ON "hr_hire_attempt" USING btree ("organization_id","offer_id") WHERE "hr_hire_attempt"."status" IN ('in_progress', 'completed');
