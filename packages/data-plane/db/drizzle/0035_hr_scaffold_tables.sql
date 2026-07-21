CREATE TABLE "hr_employment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employment_org_id_idx" ON "hr_employment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employment_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_id_idx" ON "hr_employment_contract" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_work_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_id_idx" ON "hr_work_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_department_org_id_idx" ON "hr_department" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_job_org_id_idx" ON "hr_job" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_position_org_id_idx" ON "hr_position" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_reporting_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_id_idx" ON "hr_reporting_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employment_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_id_idx" ON "hr_employment_movement" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_job_requisition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_job_requisition_org_id_idx" ON "hr_job_requisition" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_candidate_org_id_idx" ON "hr_candidate" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_candidate_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_id_idx" ON "hr_candidate_application" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_interview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_interview_org_id_idx" ON "hr_interview" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_interview_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_interview_evaluation_org_id_idx" ON "hr_interview_evaluation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employment_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_id_idx" ON "hr_employment_offer" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_onboarding_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_id_idx" ON "hr_onboarding_case" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_onboarding_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_id_idx" ON "hr_onboarding_task" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_probation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_probation_review_org_id_idx" ON "hr_probation_review" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employment_confirmation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employment_confirmation_org_id_idx" ON "hr_employment_confirmation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_termination" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_termination_org_id_idx" ON "hr_termination" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_offboarding_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_offboarding_case_org_id_idx" ON "hr_offboarding_case" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_offboarding_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_id_idx" ON "hr_offboarding_task" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_exit_interview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_exit_interview_org_id_idx" ON "hr_exit_interview" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_clearance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_clearance_org_id_idx" ON "hr_clearance" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_course_org_id_idx" ON "hr_learning_course" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_program_org_id_idx" ON "hr_learning_program" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_id_idx" ON "hr_learning_session" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_id_idx" ON "hr_learning_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_id_idx" ON "hr_learning_attendance" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_assessment_org_id_idx" ON "hr_learning_assessment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_learning_completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_id_idx" ON "hr_learning_completion" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employee_certification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_id_idx" ON "hr_employee_certification" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_development_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_development_plan_org_id_idx" ON "hr_development_plan" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_compensation_grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_org_id_idx" ON "hr_compensation_grade" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_salary_band" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_id_idx" ON "hr_salary_band" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_employee_compensation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_id_idx" ON "hr_employee_compensation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_allowance_entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_allowance_entitlement_org_id_idx" ON "hr_allowance_entitlement" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_bonus_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_bonus_eligibility_org_id_idx" ON "hr_bonus_eligibility" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_benefit_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_benefit_plan_org_id_idx" ON "hr_benefit_plan" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_benefit_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_benefit_eligibility_org_id_idx" ON "hr_benefit_eligibility" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_benefit_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_id_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_compensation_review_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_compensation_review_cycle_org_id_idx" ON "hr_compensation_review_cycle" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE TABLE "hr_compensation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_id_idx" ON "hr_compensation_review" USING btree ("organization_id","id");
