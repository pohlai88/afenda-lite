CREATE TABLE IF NOT EXISTS "hr_work_calendar_scope_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"calendar_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_calendar_scope_assignment_scope_type_check" CHECK ("scope_type" IN ('employment', 'employee', 'location', 'department', 'legal_entity', 'organization')),
	CONSTRAINT "hr_work_calendar_scope_assignment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
ALTER TABLE "hr_work_calendar_scope_assignment" ADD CONSTRAINT "hr_work_calendar_scope_assignment_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_scope_assignment_org_id_idx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_scope_assignment_org_scope_idx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","scope_type","scope_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_work_calendar_scope_assignment_org_scope_from_uidx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","scope_type","scope_key","effective_from");
