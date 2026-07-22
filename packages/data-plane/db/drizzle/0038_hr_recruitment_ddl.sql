ALTER TABLE "hr_job_requisition" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "position_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_status_check" CHECK ("status" IN ('draft', 'submitted', 'approved', 'open', 'on_hold', 'closed', 'cancelled'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_requisition_org_code_uidx" ON "hr_job_requisition" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_requisition_org_create_idempotency_uidx" ON "hr_job_requisition" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_job_requisition_org_status_idx" ON "hr_job_requisition" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "display_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "normalized_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate" ADD CONSTRAINT "hr_candidate_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_org_normalized_email_uidx" ON "hr_candidate" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_org_create_idempotency_uidx" ON "hr_candidate" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_candidate_org_status_idx" ON "hr_candidate" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "candidate_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "requisition_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_candidate_id_hr_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hr_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_status_check" CHECK ("status" IN ('submitted', 'in_review', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_application_org_candidate_requisition_open_uidx" ON "hr_candidate_application" USING btree ("organization_id","candidate_id","requisition_id") WHERE "status" NOT IN ('accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_candidate_idx" ON "hr_candidate_application" USING btree ("organization_id","candidate_id");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_requisition_idx" ON "hr_candidate_application" USING btree ("organization_id","requisition_id");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_status_idx" ON "hr_candidate_application" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "application_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "scheduled_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "interviewer_actor_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD CONSTRAINT "hr_interview_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD CONSTRAINT "hr_interview_status_check" CHECK ("status" IN ('scheduled', 'completed', 'cancelled'));--> statement-breakpoint
CREATE INDEX "hr_interview_org_application_idx" ON "hr_interview" USING btree ("organization_id","application_id");--> statement-breakpoint
CREATE INDEX "hr_interview_org_status_idx" ON "hr_interview" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "interview_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "result" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "private_notes" text;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "evaluator_actor_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "recorded_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD CONSTRAINT "hr_interview_evaluation_interview_id_hr_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."hr_interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD CONSTRAINT "hr_interview_evaluation_result_check" CHECK ("result" IN ('advance', 'hold', 'reject'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_interview_evaluation_org_interview_uidx" ON "hr_interview_evaluation" USING btree ("organization_id","interview_id");--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "application_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "terms_summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "expires_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "accept_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "accept_request_fingerprint" text;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_status_check" CHECK ("status" IN ('draft', 'issued', 'accepted', 'declined', 'expired', 'withdrawn'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_application_draft_issued_uidx" ON "hr_employment_offer" USING btree ("organization_id","application_id") WHERE "status" IN ('draft', 'issued');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_accept_idempotency_uidx" ON "hr_employment_offer" USING btree ("organization_id","accept_idempotency_key") WHERE "accept_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_status_idx" ON "hr_employment_offer" USING btree ("organization_id","status");
