DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM payroll_payslip)
		OR EXISTS (SELECT 1 FROM payroll_adjustment)
		OR EXISTS (SELECT 1 FROM payroll_reconciliation)
		OR EXISTS (SELECT 1 FROM payroll_run WHERE status = 'reversed') THEN
		RAISE EXCEPTION 'Payroll semantic cutover requires empty scaffold tables and no legacy reversed runs';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "payroll_run"
	ADD COLUMN "reversal_reason_code" text,
	ADD COLUMN "reversal_idempotency_key" text,
	ADD COLUMN "reversal_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_payslip"
	ADD COLUMN "run_id" uuid NOT NULL,
	ADD COLUMN "run_employee_id" uuid NOT NULL,
	ADD COLUMN "employee_id" text NOT NULL,
	ADD COLUMN "view_version" integer NOT NULL,
	ADD COLUMN "content_hash" text,
	ADD COLUMN "storage_key" text,
	ADD COLUMN "status" text NOT NULL,
	ADD COLUMN "published_at" timestamp with time zone,
	ADD COLUMN "published_by" text,
	ADD COLUMN "version" integer DEFAULT 1 NOT NULL,
	ADD COLUMN "created_by" text NOT NULL,
	ADD COLUMN "updated_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_adjustment"
	ADD COLUMN "original_run_id" uuid NOT NULL,
	ADD COLUMN "reversal_run_id" uuid,
	ADD COLUMN "original_run_employee_id" uuid,
	ADD COLUMN "adjustment_type" text NOT NULL,
	ADD COLUMN "amount" numeric(24,12) NOT NULL,
	ADD COLUMN "currency_code" text NOT NULL,
	ADD COLUMN "reason" text NOT NULL,
	ADD COLUMN "create_idempotency_key" text NOT NULL,
	ADD COLUMN "create_request_fingerprint" text NOT NULL,
	ADD COLUMN "created_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation"
	ADD COLUMN "run_id" uuid NOT NULL,
	ADD COLUMN "kind" text NOT NULL,
	ADD COLUMN "downstream_reference" text NOT NULL,
	ADD COLUMN "expected_amount" numeric(24,12) NOT NULL,
	ADD COLUMN "actual_amount" numeric(24,12) NOT NULL,
	ADD COLUMN "tolerance_amount" numeric(24,12) NOT NULL,
	ADD COLUMN "currency_code" text NOT NULL,
	ADD COLUMN "status" text NOT NULL,
	ADD COLUMN "resolution_note" text,
	ADD COLUMN "resolved_by" text,
	ADD COLUMN "resolved_at" timestamp with time zone,
	ADD COLUMN "create_idempotency_key" text NOT NULL,
	ADD COLUMN "create_request_fingerprint" text NOT NULL,
	ADD COLUMN "version" integer DEFAULT 1 NOT NULL,
	ADD COLUMN "created_by" text NOT NULL,
	ADD COLUMN "updated_by" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_payslip" ADD CONSTRAINT "payroll_payslip_org_id_uidx" UNIQUE("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_adjustment" ADD CONSTRAINT "payroll_adjustment_org_id_uidx" UNIQUE("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_org_id_uidx" UNIQUE("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_payslip_org_run_employee_version_uidx" ON "payroll_payslip" ("organization_id","run_employee_id","view_version");
--> statement-breakpoint
CREATE INDEX "payroll_payslip_org_employee_idx" ON "payroll_payslip" ("organization_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_org_reversal_idempotency_uidx" ON "payroll_run" ("organization_id","reversal_idempotency_key") WHERE "reversal_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_employee_org_id_run_employee_uidx" ON "payroll_run_employee" ("organization_id","id","run_id","employee_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_adjustment_org_idempotency_uidx" ON "payroll_adjustment" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX "payroll_adjustment_org_original_run_idx" ON "payroll_adjustment" ("organization_id","original_run_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_reconciliation_org_downstream_uidx" ON "payroll_reconciliation" ("organization_id","kind","downstream_reference");
--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_reconciliation_org_idempotency_uidx" ON "payroll_reconciliation" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX "payroll_reconciliation_org_run_idx" ON "payroll_reconciliation" ("organization_id","run_id");
--> statement-breakpoint
ALTER TABLE "payroll_payslip" ADD CONSTRAINT "payroll_payslip_status_check" CHECK ("status" IN ('pending','generated','published','superseded'));
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_reversal_evidence_check" CHECK (("status" = 'reversed' AND "reversal_reason_code" IS NOT NULL AND "reversal_idempotency_key" IS NOT NULL AND "reversal_request_fingerprint" IS NOT NULL) OR ("status" <> 'reversed' AND "reversal_reason_code" IS NULL AND "reversal_idempotency_key" IS NULL AND "reversal_request_fingerprint" IS NULL));
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_reversal_reason_code_check" CHECK ("reversal_reason_code" IS NULL OR "reversal_reason_code" IN ('calculation_correction','employee_data_correction','statutory_correction','payment_correction','accounting_correction','operational_correction'));
--> statement-breakpoint
ALTER TABLE "payroll_adjustment" ADD CONSTRAINT "payroll_adjustment_type_check" CHECK ("adjustment_type" IN ('reversal','adjustment'));
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_kind_check" CHECK ("kind" IN ('payment','accounting'));
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_status_check" CHECK ("status" IN ('matched','discrepant','resolved'));
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_resolution_evidence_check" CHECK (("status" = 'resolved' AND "resolution_note" IS NOT NULL AND "resolved_by" IS NOT NULL AND "resolved_at" IS NOT NULL) OR ("status" <> 'resolved' AND "resolution_note" IS NULL AND "resolved_by" IS NULL AND "resolved_at" IS NULL));
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_nonnegative_amounts_check" CHECK ("expected_amount" >= 0 AND "actual_amount" >= 0 AND "tolerance_amount" >= 0);
--> statement-breakpoint
ALTER TABLE "payroll_payslip" ADD CONSTRAINT "payroll_payslip_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "payroll_run"("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_payslip" ADD CONSTRAINT "payroll_payslip_org_run_employee_lineage_fk" FOREIGN KEY ("organization_id","run_employee_id","run_id","employee_id") REFERENCES "payroll_run_employee"("organization_id","id","run_id","employee_id");
--> statement-breakpoint
ALTER TABLE "payroll_adjustment" ADD CONSTRAINT "payroll_adjustment_org_original_run_fk" FOREIGN KEY ("organization_id","original_run_id") REFERENCES "payroll_run"("organization_id","id");
--> statement-breakpoint
ALTER TABLE "payroll_reconciliation" ADD CONSTRAINT "payroll_reconciliation_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "payroll_run"("organization_id","id");
