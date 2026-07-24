CREATE TABLE IF NOT EXISTS "payroll_rule_finalized_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"rule_kind" text NOT NULL,
	"rule_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_rule_finalized_usage_kind_check" CHECK ("rule_kind" IN ('earning', 'deduction', 'statutory'))
);
--> statement-breakpoint
ALTER TABLE "payroll_rule_finalized_usage" ADD CONSTRAINT "payroll_rule_finalized_usage_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_rule_finalized_usage_org_rule_idx" ON "payroll_rule_finalized_usage" USING btree ("organization_id","rule_kind","rule_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_rule_finalized_usage_org_rule_run_uidx" ON "payroll_rule_finalized_usage" USING btree ("organization_id","rule_kind","rule_id","run_id");
