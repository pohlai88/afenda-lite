-- HR Slice 8.5 — promote benefit eligibility, enrollment contributions, dependents, waiver.

ALTER TABLE "hr_benefit_eligibility"
	ADD COLUMN IF NOT EXISTS "plan_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_benefit_eligibility"
	ADD COLUMN IF NOT EXISTS "min_tenure_days" integer;
--> statement-breakpoint
ALTER TABLE "hr_benefit_eligibility"
	ADD COLUMN IF NOT EXISTS "allowed_employment_statuses" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_eligibility"
	ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_eligibility"
	ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD COLUMN IF NOT EXISTS "employee_contribution_amount" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD COLUMN IF NOT EXISTS "employer_contribution_amount" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD COLUMN IF NOT EXISTS "contribution_currency_code" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD COLUMN IF NOT EXISTS "contribution_frequency" text;
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD COLUMN IF NOT EXISTS "waiver_reason" text;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'hr_benefit_eligibility_plan_id_hr_benefit_plan_id_fk'
	) THEN
		ALTER TABLE "hr_benefit_eligibility"
			ADD CONSTRAINT "hr_benefit_eligibility_plan_id_hr_benefit_plan_id_fk"
			FOREIGN KEY ("plan_id") REFERENCES "public"."hr_benefit_plan"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_benefit_eligibility_org_plan_idx"
	ON "hr_benefit_eligibility" USING btree ("organization_id", "plan_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_benefit_eligibility_org_plan_uidx"
	ON "hr_benefit_eligibility" USING btree ("organization_id", "plan_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "hr_benefit_enrollment_org_employee_plan_active_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_employee_plan_open_uidx"
	ON "hr_benefit_enrollment" USING btree ("organization_id", "employee_id", "plan_id")
	WHERE "status" IN ('active', 'waived');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_benefit_enrollment_dependent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"dependent_name" text NOT NULL,
	"relationship" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'hr_benefit_enrollment_dependent_enrollment_id_hr_benefit_enrollment_id_fk'
	) THEN
		ALTER TABLE "hr_benefit_enrollment_dependent"
			ADD CONSTRAINT "hr_benefit_enrollment_dependent_enrollment_id_hr_benefit_enrollment_id_fk"
			FOREIGN KEY ("enrollment_id") REFERENCES "public"."hr_benefit_enrollment"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_benefit_enrollment_dependent_org_id_idx"
	ON "hr_benefit_enrollment_dependent" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_benefit_enrollment_dependent_org_enrollment_idx"
	ON "hr_benefit_enrollment_dependent" USING btree ("organization_id", "enrollment_id");
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment_dependent"
	ADD CONSTRAINT "hr_benefit_enrollment_dependent_effective_range_ck"
	CHECK ("effective_to" IS NULL OR "effective_from" <= "effective_to");
