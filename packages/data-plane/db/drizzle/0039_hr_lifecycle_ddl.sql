ALTER TABLE "hr_employment_movement" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "movement_kind" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "from_assignment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "to_assignment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "from_position_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "to_position_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "effective_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "reason" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("from_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("to_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_position_id_hr_position_id_fk" FOREIGN KEY ("from_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_position_id_hr_position_id_fk" FOREIGN KEY ("to_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_kind_check" CHECK ("movement_kind" IN ('transfer'));--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_employment_idx" ON "hr_employment_movement" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_movement_org_create_idempotency_uidx" ON "hr_employment_movement" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "source_offer_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "started_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_source_offer_id_hr_employment_offer_id_fk" FOREIGN KEY ("source_offer_id") REFERENCES "public"."hr_employment_offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_status_check" CHECK ("status" IN ('in_progress', 'completed', 'cancelled'));--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_employment_idx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_employment_open_uidx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id") WHERE "status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_create_idempotency_uidx" ON "hr_onboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "case_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "mandatory" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD CONSTRAINT "hr_onboarding_task_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD CONSTRAINT "hr_onboarding_task_status_check" CHECK ("status" IN ('pending', 'completed', 'waived'));--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_case_idx" ON "hr_onboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_task_org_case_code_uidx" ON "hr_onboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "starts_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "ends_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "outcome_actor_id" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "outcome_recorded_on" date;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_status_check" CHECK ("status" IN ('open', 'closed'));--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_outcome_check" CHECK ("outcome" IS NULL OR "outcome" IN ('passed', 'failed'));--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_date_range_check" CHECK ("ends_on" >= "starts_on");--> statement-breakpoint
CREATE INDEX "hr_probation_review_org_employment_idx" ON "hr_probation_review" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_probation_review_org_employment_open_uidx" ON "hr_probation_review" USING btree ("organization_id","employment_id") WHERE "status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_probation_review_org_create_idempotency_uidx" ON "hr_probation_review" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "confirmed_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "confirmed_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "evidence_note" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_employment_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_create_idempotency_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "reason_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "reason_detail" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "effective_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_status_check" CHECK ("status" IN ('draft', 'finalized'));--> statement-breakpoint
CREATE INDEX "hr_termination_org_employment_idx" ON "hr_termination" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_employment_finalized_uidx" ON "hr_termination" USING btree ("organization_id","employment_id") WHERE "status" = 'finalized';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_create_idempotency_uidx" ON "hr_termination" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "termination_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "started_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_termination_id_hr_termination_id_fk" FOREIGN KEY ("termination_id") REFERENCES "public"."hr_termination"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_status_check" CHECK ("status" IN ('in_progress', 'completed', 'cancelled'));--> statement-breakpoint
CREATE INDEX "hr_offboarding_case_org_employment_idx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_employment_open_uidx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id") WHERE "status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_create_idempotency_uidx" ON "hr_offboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "case_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "mandatory" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD CONSTRAINT "hr_offboarding_task_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD CONSTRAINT "hr_offboarding_task_status_check" CHECK ("status" IN ('pending', 'completed', 'waived'));--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_case_idx" ON "hr_offboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_task_org_case_code_uidx" ON "hr_offboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "offboarding_case_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "conducted_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "notes" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD CONSTRAINT "hr_exit_interview_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD CONSTRAINT "hr_exit_interview_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hr_exit_interview_org_case_uidx" ON "hr_exit_interview" USING btree ("organization_id","offboarding_case_id");--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "offboarding_case_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "cleared_on" date;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_status_check" CHECK ("status" IN ('pending', 'cleared'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_clearance_org_case_uidx" ON "hr_clearance" USING btree ("organization_id","offboarding_case_id");
