CREATE TABLE IF NOT EXISTS "hr_work_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"calendar_version" text NOT NULL,
	"work_week_json" jsonb NOT NULL,
	"standard_hours_per_day" numeric(6, 2) NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_calendar_status_check" CHECK ("status" IN ('active', 'archived')),
	CONSTRAINT "hr_work_calendar_hours_pos_check" CHECK ("standard_hours_per_day"::numeric > 0),
	CONSTRAINT "hr_work_calendar_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_work_calendar_holiday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"calendar_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"label" text,
	"location_code" text,
	"jurisdiction" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_employment_calendar_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"location_code" text,
	"jurisdiction" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employment_calendar_assignment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
ALTER TABLE "hr_work_calendar_holiday" ADD CONSTRAINT "hr_work_calendar_holiday_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_org_id_idx" ON "hr_work_calendar" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_org_status_idx" ON "hr_work_calendar" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_work_calendar_org_code_uidx" ON "hr_work_calendar" USING btree ("organization_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_holiday_org_id_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_holiday_org_calendar_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","calendar_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_work_calendar_holiday_org_date_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","holiday_date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_work_calendar_holiday_org_calendar_date_loc_jur_uidx" ON "hr_work_calendar_holiday" USING btree ("organization_id","calendar_id","holiday_date","location_code","jurisdiction");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_employment_calendar_assignment_org_id_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_employment_calendar_assignment_org_employment_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hr_employment_calendar_assignment_org_employee_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_employment_calendar_assignment_org_employment_from_uidx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employment_id","effective_from");
