CREATE TABLE "payroll_retro_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"origin_period_id" uuid NOT NULL,
	"origin_run_id" uuid,
	"employee_id" text NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"correlation_id" text NOT NULL,
	"correction_json" jsonb NOT NULL,
	"difference_json" jsonb,
	"target_period_id" uuid,
	"target_run_id" uuid,
	"applied_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_retro_item_status_check" CHECK ("status" IN ('queued', 'calculated', 'applied')),
	CONSTRAINT "payroll_retro_item_applied_shape_check" CHECK (("status" <> 'applied') OR ("origin_run_id" IS NOT NULL AND "target_period_id" IS NOT NULL AND "target_run_id" IS NOT NULL AND "applied_at" IS NOT NULL AND "difference_json" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "payroll_retro_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"retro_item_id" uuid NOT NULL,
	"target_run_id" uuid NOT NULL,
	"origin_period_id" uuid NOT NULL,
	"origin_run_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"line_kind" text NOT NULL,
	"code" text NOT NULL,
	"rule_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"rule_kind" text NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_retro_line_kind_check" CHECK ("line_kind" IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution')),
	CONSTRAINT "payroll_retro_line_rule_kind_check" CHECK ("rule_kind" IN ('earning', 'deduction', 'statutory', 'none'))
);
--> statement-breakpoint
CREATE INDEX "payroll_retro_item_org_id_idx" ON "payroll_retro_item" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_retro_item_org_status_idx" ON "payroll_retro_item" ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "payroll_retro_item_org_origin_period_idx" ON "payroll_retro_item" ("organization_id","origin_period_id");
--> statement-breakpoint
CREATE INDEX "payroll_retro_item_org_target_run_idx" ON "payroll_retro_item" ("organization_id","target_run_id");
--> statement-breakpoint
ALTER TABLE "payroll_retro_item" ADD CONSTRAINT "payroll_retro_item_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_retro_item_org_create_idempotency_uidx" ON "payroll_retro_item" ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_retro_item" ADD CONSTRAINT "payroll_retro_item_org_origin_period_fk" FOREIGN KEY ("organization_id","origin_period_id") REFERENCES "payroll_period"("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_retro_line_org_id_idx" ON "payroll_retro_line" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_retro_line_org_target_run_idx" ON "payroll_retro_line" ("organization_id","target_run_id");
--> statement-breakpoint
ALTER TABLE "payroll_retro_line" ADD CONSTRAINT "payroll_retro_line_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_retro_line_org_item_sequence_uidx" ON "payroll_retro_line" ("organization_id","retro_item_id","sequence");
--> statement-breakpoint
ALTER TABLE "payroll_retro_line" ADD CONSTRAINT "payroll_retro_line_org_item_fk" FOREIGN KEY ("organization_id","retro_item_id") REFERENCES "payroll_retro_item"("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_retro_line" ADD CONSTRAINT "payroll_retro_line_org_target_run_fk" FOREIGN KEY ("organization_id","target_run_id") REFERENCES "payroll_run"("organization_id","id");
