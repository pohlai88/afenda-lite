ALTER TABLE "hr_probation_review" ADD COLUMN "last_extension_reason" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "last_extension_evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "outcome_reason" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD COLUMN "outcome_evidence_reference" text;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_outcome_recorded_on_range_ck" CHECK (
	"outcome_recorded_on" IS NULL
	OR ("starts_on" <= "outcome_recorded_on" AND "outcome_recorded_on" <= "ends_on")
);--> statement-breakpoint
CREATE TABLE "hr_probation_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"probation_review_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewed_on" date NOT NULL,
	"reason" text NOT NULL,
	"evidence_reference" text,
	"actor_user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_probation_review_id_hr_probation_review_id_fk" FOREIGN KEY ("probation_review_id") REFERENCES "public"."hr_probation_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_probation_assessment_org_id_idx" ON "hr_probation_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_probation_assessment_org_probation_review_idx" ON "hr_probation_assessment" USING btree ("organization_id","probation_review_id");--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_reviewed_on_range_ck" CHECK (
	"reviewed_on" IS NOT NULL
);
