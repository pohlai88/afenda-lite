ALTER TABLE "hr_termination" ADD COLUMN "approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "approved_by" text;
--> statement-breakpoint
ALTER TABLE "hr_termination" ADD COLUMN "rehire_eligible" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_employment_draft_uidx" ON "hr_termination" USING btree ("organization_id","employment_id") WHERE "status" = 'draft';
--> statement-breakpoint
CREATE TABLE "hr_offboarding_access_revocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"revoked_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_offboarding_access_revocation_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "hr_offboarding_access_revocation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_payroll_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"ready_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_offboarding_payroll_handoff_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "hr_offboarding_payroll_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "hr_offboarding_access_revocation_org_id_idx" ON "hr_offboarding_access_revocation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_access_revocation_org_case_uidx" ON "hr_offboarding_access_revocation" USING btree ("organization_id","offboarding_case_id");
--> statement-breakpoint
CREATE INDEX "hr_offboarding_payroll_handoff_org_id_idx" ON "hr_offboarding_payroll_handoff" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_payroll_handoff_org_case_uidx" ON "hr_offboarding_payroll_handoff" USING btree ("organization_id","offboarding_case_id");
--> statement-breakpoint
ALTER TABLE "hr_offboarding_access_revocation" ADD CONSTRAINT "hr_offboarding_access_revocation_status_check" CHECK ("status" IN ('pending', 'revoked'));
--> statement-breakpoint
ALTER TABLE "hr_offboarding_payroll_handoff" ADD CONSTRAINT "hr_offboarding_payroll_handoff_status_check" CHECK ("status" IN ('pending', 'ready'));
