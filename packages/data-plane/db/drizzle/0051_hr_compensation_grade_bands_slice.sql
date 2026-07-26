ALTER TABLE "hr_salary_band"
	ADD COLUMN "supersedes_salary_band_id" uuid;

ALTER TABLE "hr_salary_band"
	ADD CONSTRAINT "hr_salary_band_supersedes_salary_band_id_hr_salary_band_id_fk"
	FOREIGN KEY ("supersedes_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "hr_salary_band_org_supersedes_idx" ON "hr_salary_band" USING btree ("organization_id", "supersedes_salary_band_id");

CREATE TABLE "hr_compensation_grade_progression_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"from_grade_id" uuid NOT NULL,
	"to_grade_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"min_months_in_grade" integer,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_compensation_grade_progression_rule_effective_range_ck" CHECK ("effective_to" IS NULL OR "effective_from" <= "effective_to"),
	CONSTRAINT "hr_compensation_grade_progression_rule_from_to_ck" CHECK ("from_grade_id" <> "to_grade_id")
);

ALTER TABLE "hr_compensation_grade_progression_rule"
	ADD CONSTRAINT "hr_compensation_grade_progression_rule_from_grade_id_hr_compensation_grade_id_fk"
	FOREIGN KEY ("from_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "hr_compensation_grade_progression_rule"
	ADD CONSTRAINT "hr_compensation_grade_progression_rule_to_grade_id_hr_compensation_grade_id_fk"
	FOREIGN KEY ("to_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "hr_compensation_grade_progression_rule_org_from_idx" ON "hr_compensation_grade_progression_rule" USING btree ("organization_id", "from_grade_id");

CREATE INDEX "hr_compensation_grade_progression_rule_org_status_idx" ON "hr_compensation_grade_progression_rule" USING btree ("organization_id", "status");
