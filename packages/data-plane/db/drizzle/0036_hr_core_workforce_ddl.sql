ALTER TABLE "hr_employment" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "starts_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_status_check" CHECK ("status" IN ('active', 'notice', 'terminated'));--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_date_range_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");--> statement-breakpoint
CREATE INDEX "hr_employment_org_employee_idx" ON "hr_employment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_org_employee_open_uidx" ON "hr_employment" USING btree ("organization_id","employee_id") WHERE "ends_on" IS NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_status_check" CHECK ("status" IN ('active', 'inactive'));--> statement-breakpoint
CREATE UNIQUE INDEX "hr_position_org_code_uidx" ON "hr_position" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_position_org_status_idx" ON "hr_position" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "reference_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "starts_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_date_range_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_contract_org_employment_ref_uidx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","reference_code");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_employment_idx" ON "hr_employment_contract" USING btree ("organization_id","employment_id");--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "employment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "employee_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "position_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "starts_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "updated_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_date_range_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_assignment_org_employment_open_uidx" ON "hr_work_assignment" USING btree ("organization_id","employment_id") WHERE "ends_on" IS NULL;--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_employment_idx" ON "hr_work_assignment" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_position_idx" ON "hr_work_assignment" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE INDEX "hr_employee_org_updated_at_idx" ON "hr_employee" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "hr_employee_org_legal_name_idx" ON "hr_employee" USING btree ("organization_id","legal_name");
