CREATE TABLE "hr_performance_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"rating_scale" jsonb NOT NULL,
	"weighting_model" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_id_idx" ON "hr_performance_cycle" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_status_idx" ON "hr_performance_cycle" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_code_uidx" ON "hr_performance_cycle" USING btree ("organization_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_create_idempotency_uidx" ON "hr_performance_cycle" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle" ADD CONSTRAINT "hr_performance_cycle_status_check" CHECK ("status" IN ('draft', 'open', 'closed', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle" ADD CONSTRAINT "hr_performance_cycle_weighting_model_check" CHECK ("weighting_model" IN ('none', 'percent100'));
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle" ADD CONSTRAINT "hr_performance_cycle_period_range_check" CHECK ("period_end" >= "period_start");
--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_id_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_cycle_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_participant_org_cycle_employment_active_uidx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id","employment_id") WHERE "status" = 'active';
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_status_check" CHECK ("status" IN ('active', 'removed'));
--> statement-breakpoint
CREATE TABLE "hr_performance_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"weight" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"exception_outside_cycle" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_id_idx" ON "hr_performance_goal" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_cycle_idx" ON "hr_performance_goal" USING btree ("organization_id","cycle_id");
--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_employee_idx" ON "hr_performance_goal" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_goal_org_create_idempotency_uidx" ON "hr_performance_goal" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_status_check" CHECK ("status" IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_period_range_check" CHECK ("period_end" >= "period_start");
--> statement-breakpoint
CREATE TABLE "hr_performance_goal_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goal_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"progress_note" text NOT NULL,
	"progress_value" text,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_goal_progress_org_id_idx" ON "hr_performance_goal_progress" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_goal_progress_org_goal_idx" ON "hr_performance_goal_progress" USING btree ("organization_id","goal_id");
--> statement-breakpoint
ALTER TABLE "hr_performance_goal_progress" ADD CONSTRAINT "hr_performance_goal_progress_goal_id_hr_performance_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."hr_performance_goal"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "hr_performance_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"overall_rating" text,
	"acknowledgement_note" text,
	"status" text NOT NULL,
	"finalize_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_id_idx" ON "hr_performance_review" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_cycle_idx" ON "hr_performance_review" USING btree ("organization_id","cycle_id");
--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_employee_idx" ON "hr_performance_review" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_review_org_finalize_idempotency_uidx" ON "hr_performance_review" USING btree ("organization_id","finalize_idempotency_key") WHERE "finalize_idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_status_check" CHECK ("status" IN ('draft', 'self_submitted', 'manager_submitted', 'returned', 'acknowledged', 'finalized', 'reopened'));
--> statement-breakpoint
CREATE TABLE "hr_performance_review_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"role" text NOT NULL,
	"employee_id" uuid,
	"user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_review_participant_org_id_idx" ON "hr_performance_review_participant" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_review_participant_org_review_idx" ON "hr_performance_review_participant" USING btree ("organization_id","review_id");
--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD CONSTRAINT "hr_performance_review_participant_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD CONSTRAINT "hr_performance_review_participant_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD CONSTRAINT "hr_performance_review_participant_role_check" CHECK ("role" IN ('self', 'manager', 'delegated'));
--> statement-breakpoint
CREATE TABLE "hr_performance_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"rating" text,
	"comments_sensitive" text,
	"submitted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_id_idx" ON "hr_performance_assessment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_review_idx" ON "hr_performance_assessment" USING btree ("organization_id","review_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_assessment_org_review_kind_uidx" ON "hr_performance_assessment" USING btree ("organization_id","review_id","kind");
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_kind_check" CHECK ("kind" IN ('self', 'manager'));
--> statement-breakpoint
CREATE TABLE "hr_performance_improvement_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"performance_gap" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"measurable_actions" text NOT NULL,
	"support_resources" text NOT NULL,
	"due_date" date NOT NULL,
	"accountable_manager_employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_plan_org_id_idx" ON "hr_performance_improvement_plan" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_plan_org_review_idx" ON "hr_performance_improvement_plan" USING btree ("organization_id","review_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_improvement_plan_org_create_idempotency_uidx" ON "hr_performance_improvement_plan" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("accountable_manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_status_check" CHECK ("status" IN ('draft', 'open', 'acknowledged', 'completed', 'unsuccessful', 'cancelled'));
--> statement-breakpoint
CREATE TABLE "hr_performance_improvement_checkpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"outcome" text NOT NULL,
	"notes" text,
	"recorded_by" text,
	"recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_checkpoint_org_id_idx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_checkpoint_org_plan_idx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","plan_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_improvement_checkpoint_org_plan_sequence_uidx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","plan_id","sequence_number");
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_checkpoint" ADD CONSTRAINT "hr_performance_improvement_checkpoint_plan_id_hr_performance_improvement_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_performance_improvement_plan"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_checkpoint" ADD CONSTRAINT "hr_performance_improvement_checkpoint_outcome_check" CHECK ("outcome" IN ('pending', 'met', 'missed'));
