-- Phase 6: promote calculation output scaffolds and run metadata.

ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "calculation_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "rounding_policy_json" jsonb;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "tax_timing" text;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "tax_timing" = 'post_tax' WHERE "tax_timing" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "tax_timing" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_tax_timing_check" CHECK ("tax_timing" IN ('pre_tax', 'post_tax'));
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "run_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "assignment_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "gross" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "employee_deductions" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "employee_statutory" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "employer_cost" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "net" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "snapshot_json" jsonb;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "snapshot_hash" text;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "calculation_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "run_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "run_employee_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "line_kind" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "rule_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "rule_kind" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "source_type" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "sequence" integer;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD COLUMN IF NOT EXISTS "trace_ref" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "run_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "run_employee_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "jurisdiction_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "rule_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "calculator_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "base_amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "employee_amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "employer_amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD COLUMN IF NOT EXISTS "config_snapshot_json" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_run_employee_org_run_idx" ON "payroll_run_employee" USING btree ("organization_id","run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_run_employee_org_run_employee_uidx" ON "payroll_run_employee" USING btree ("organization_id","run_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_run_employee_org_id_uidx" ON "payroll_run_employee" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_result_line_org_run_idx" ON "payroll_result_line" USING btree ("organization_id","run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_result_line_org_run_employee_sequence_uidx" ON "payroll_result_line" USING btree ("organization_id","run_id","employee_id","sequence");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_statutory_result_org_run_idx" ON "payroll_statutory_result" USING btree ("organization_id","run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_statutory_result_org_run_employee_rule_uidx" ON "payroll_statutory_result" USING btree ("organization_id","run_id","employee_id","rule_code","rule_version");
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD CONSTRAINT "payroll_run_employee_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_org_run_employee_fk" FOREIGN KEY ("organization_id","run_employee_id") REFERENCES "public"."payroll_run_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD CONSTRAINT "payroll_statutory_result_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD CONSTRAINT "payroll_statutory_result_org_run_employee_fk" FOREIGN KEY ("organization_id","run_employee_id") REFERENCES "public"."payroll_run_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD CONSTRAINT "payroll_run_employee_status_check" CHECK ("status" IN ('calculated', 'failed'));
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_kind_check" CHECK ("line_kind" IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution'));
--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_rule_kind_check" CHECK ("rule_kind" IN ('earning', 'deduction', 'statutory', 'none'));
