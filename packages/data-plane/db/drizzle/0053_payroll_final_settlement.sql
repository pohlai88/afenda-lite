CREATE TABLE "payroll_final_settlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"termination_id" text NOT NULL,
	"termination_effective_on" date NOT NULL,
	"period_id" uuid NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"origin_run_id" uuid,
	"status" text NOT NULL,
	"facts_json" jsonb NOT NULL,
	"totals_json" jsonb,
	"statement_json" jsonb,
	"clearance_required_reason" text,
	"clearance_reason" text,
	"clearance_by" text,
	"clearance_at" timestamp with time zone,
	"calculated_by" text,
	"calculated_at" timestamp with time zone,
	"finalized_by" text,
	"finalized_at" timestamp with time zone,
	"correlation_id" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_final_settlement_status_check" CHECK ("status" IN ('initiated', 'clearance_required', 'calculated', 'finalized', 'stated')),
	CONSTRAINT "payroll_final_settlement_calculated_shape_check" CHECK (("status" NOT IN ('calculated', 'finalized', 'stated')) OR ("totals_json" IS NOT NULL AND "calculated_by" IS NOT NULL AND "calculated_at" IS NOT NULL)),
	CONSTRAINT "payroll_final_settlement_finalized_shape_check" CHECK (("status" NOT IN ('finalized', 'stated')) OR ("finalized_by" IS NOT NULL AND "finalized_at" IS NOT NULL)),
	CONSTRAINT "payroll_final_settlement_stated_shape_check" CHECK (("status" <> 'stated') OR ("statement_json" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "payroll_final_settlement_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"settlement_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"code" text NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_final_settlement_line_kind_check" CHECK ("kind" IN ('prorated_base', 'leave_encashment', 'notice_pay', 'notice_in_lieu', 'recovery', 'employee_statutory', 'employer_statutory'))
);
--> statement-breakpoint
CREATE INDEX "payroll_final_settlement_org_id_idx" ON "payroll_final_settlement" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_final_settlement_org_status_idx" ON "payroll_final_settlement" ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "payroll_final_settlement_org_employee_idx" ON "payroll_final_settlement" ("organization_id","employee_id");
--> statement-breakpoint
ALTER TABLE "payroll_final_settlement" ADD CONSTRAINT "payroll_final_settlement_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_final_settlement_org_create_idempotency_uidx" ON "payroll_final_settlement" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_final_settlement_org_termination_uidx" ON "payroll_final_settlement" ("organization_id","termination_id");
--> statement-breakpoint
ALTER TABLE "payroll_final_settlement" ADD CONSTRAINT "payroll_final_settlement_org_period_fk" FOREIGN KEY ("organization_id","period_id") REFERENCES "payroll_period"("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_final_settlement" ADD CONSTRAINT "payroll_final_settlement_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "payroll_pay_group"("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_final_settlement_line_org_id_idx" ON "payroll_final_settlement_line" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "payroll_final_settlement_line_org_settlement_idx" ON "payroll_final_settlement_line" ("organization_id","settlement_id");
--> statement-breakpoint
ALTER TABLE "payroll_final_settlement_line" ADD CONSTRAINT "payroll_final_settlement_line_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_final_settlement_line_org_settlement_sequence_uidx" ON "payroll_final_settlement_line" ("organization_id","settlement_id","sequence");
--> statement-breakpoint
ALTER TABLE "payroll_final_settlement_line" ADD CONSTRAINT "payroll_final_settlement_line_org_settlement_fk" FOREIGN KEY ("organization_id","settlement_id") REFERENCES "payroll_final_settlement"("organization_id","id");
