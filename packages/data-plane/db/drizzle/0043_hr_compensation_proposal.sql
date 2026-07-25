CREATE TABLE "hr_compensation_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"status" text NOT NULL,
	"proposed_base_amount" text,
	"proposed_currency_code" text,
	"proposed_grade_id" uuid,
	"proposed_salary_band_id" uuid,
	"confidential_note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_proposed_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("proposed_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_proposed_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("proposed_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_id_idx" ON "hr_compensation_proposal" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_application_idx" ON "hr_compensation_proposal" USING btree ("organization_id","application_id");
--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_status_idx" ON "hr_compensation_proposal" USING btree ("organization_id","status");
--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD COLUMN "compensation_proposal_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_compensation_proposal_id_hr_compensation_proposal_id_fk" FOREIGN KEY ("compensation_proposal_id") REFERENCES "public"."hr_compensation_proposal"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "hr_employment_offer_org_application_draft_issued_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_application_active_uidx" ON "hr_employment_offer" USING btree ("organization_id","application_id") WHERE status IN ('draft', 'approved', 'issued');
