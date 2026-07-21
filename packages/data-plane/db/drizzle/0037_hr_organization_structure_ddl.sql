ALTER TABLE "hr_department" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "parent_department_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_department" ADD CONSTRAINT "hr_department_parent_department_id_hr_department_id_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_department" ADD CONSTRAINT "hr_department_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
ALTER TABLE "hr_department" ADD CONSTRAINT "hr_department_parent_not_self_check" CHECK ("parent_department_id" IS DISTINCT FROM "id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_department_org_code_uidx" ON "hr_department" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_department_org_parent_idx" ON "hr_department" USING btree ("organization_id","parent_department_id");--> statement-breakpoint
CREATE INDEX "hr_department_org_status_idx" ON "hr_department" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_job" ADD CONSTRAINT "hr_job_status_check" CHECK ("status" IN ('active', 'archived'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_org_code_uidx" ON "hr_job" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_job_org_status_idx" ON "hr_job" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_position" DROP CONSTRAINT IF EXISTS "hr_position_status_check";--> statement-breakpoint
UPDATE "hr_position" SET "status" = 'closed' WHERE "status" = 'inactive';--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_status_check" CHECK ("status" IN ('active', 'frozen', 'closed'));--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hr_position_org_department_idx" ON "hr_position" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "hr_position_org_job_idx" ON "hr_position" USING btree ("organization_id","job_id");--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "manager_employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "relationship_kind" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "starts_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_kind_check" CHECK ("relationship_kind" IN ('primary'));--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_not_self_check" CHECK ("employee_id" <> "manager_employee_id");--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_date_range_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_reporting_line_org_employee_open_primary_uidx" ON "hr_reporting_line" USING btree ("organization_id","employee_id") WHERE "ends_on" IS NULL AND "relationship_kind" = 'primary';--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_employee_idx" ON "hr_reporting_line" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_manager_idx" ON "hr_reporting_line" USING btree ("organization_id","manager_employee_id");
