ALTER TABLE "hr_compensation_grade" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade" ADD CONSTRAINT "hr_compensation_grade_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_grade_org_code_uidx" ON "hr_compensation_grade" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_org_status_idx" ON "hr_compensation_grade" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "grade_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "minimum_amount" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "midpoint_amount" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "maximum_amount" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "currency_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "effective_from" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "effective_to" date;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_status_check" CHECK ("status" IN ('active', 'superseded', 'archived'));--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_amount_order_check" CHECK (("minimum_amount"::numeric <= "midpoint_amount"::numeric) AND ("midpoint_amount"::numeric <= "maximum_amount"::numeric));--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_grade_idx" ON "hr_salary_band" USING btree ("organization_id","grade_id");--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_status_idx" ON "hr_salary_band" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "grade_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "salary_band_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "base_amount" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "currency_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "effective_from" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "effective_to" date;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "reason" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "source_review_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_status_check" CHECK ("status" IN ('active', 'ended'));--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_base_nonneg_check" CHECK ("base_amount"::numeric >= 0);--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_employee_idx" ON "hr_employee_compensation" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_employment_idx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_active_uidx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_create_idempotency_uidx" ON "hr_employee_compensation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "proposed_base_amount" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "proposed_currency_code" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "proposed_grade_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "proposed_salary_band_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "recommendation_note" text;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "applied_compensation_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_proposed_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("proposed_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_proposed_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("proposed_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_applied_compensation_id_hr_employee_compensation_id_fk" FOREIGN KEY ("applied_compensation_id") REFERENCES "public"."hr_employee_compensation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_status_check" CHECK ("status" IN ('draft', 'recorded', 'finalized'));--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employee_idx" ON "hr_compensation_review" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employment_idx" ON "hr_compensation_review" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_org_create_idempotency_uidx" ON "hr_compensation_review" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "eligibility_note" text;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_plan" ADD CONSTRAINT "hr_benefit_plan_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_plan_org_code_uidx" ON "hr_benefit_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_benefit_plan_org_status_idx" ON "hr_benefit_plan" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "plan_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "effective_from" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "effective_to" date;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "create_idempotency_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "create_request_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_plan_id_hr_benefit_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_benefit_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_status_check" CHECK ("status" IN ('active', 'ended', 'cancelled'));--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_employee_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_plan_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_employee_plan_active_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id","plan_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_create_idempotency_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","create_idempotency_key");
