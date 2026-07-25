CREATE TABLE "hr_onboarding_orientation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"acknowledged_on" date,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_orientation_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "hr_onboarding_orientation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_equipment_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"handed_over_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_equipment_handoff_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "hr_onboarding_equipment_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_access_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"granted_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_access_handoff_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "hr_onboarding_access_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "hr_onboarding_orientation_org_id_idx" ON "hr_onboarding_orientation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_orientation_org_case_uidx" ON "hr_onboarding_orientation" USING btree ("organization_id","onboarding_case_id");
--> statement-breakpoint
CREATE INDEX "hr_onboarding_equipment_handoff_org_id_idx" ON "hr_onboarding_equipment_handoff" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_equipment_handoff_org_case_uidx" ON "hr_onboarding_equipment_handoff" USING btree ("organization_id","onboarding_case_id");
--> statement-breakpoint
CREATE INDEX "hr_onboarding_access_handoff_org_id_idx" ON "hr_onboarding_access_handoff" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_access_handoff_org_case_uidx" ON "hr_onboarding_access_handoff" USING btree ("organization_id","onboarding_case_id");
--> statement-breakpoint
ALTER TABLE "hr_onboarding_orientation" ADD CONSTRAINT "hr_onboarding_orientation_status_check" CHECK ("status" IN ('pending', 'acknowledged'));
--> statement-breakpoint
ALTER TABLE "hr_onboarding_equipment_handoff" ADD CONSTRAINT "hr_onboarding_equipment_handoff_status_check" CHECK ("status" IN ('pending', 'handed_over'));
--> statement-breakpoint
ALTER TABLE "hr_onboarding_access_handoff" ADD CONSTRAINT "hr_onboarding_access_handoff_status_check" CHECK ("status" IN ('pending', 'granted'));
