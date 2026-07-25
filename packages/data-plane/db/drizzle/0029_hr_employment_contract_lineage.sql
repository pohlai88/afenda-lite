ALTER TABLE "hr_employment_contract" ADD COLUMN IF NOT EXISTS "lineage_status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN IF NOT EXISTS "supersedes_contract_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN IF NOT EXISTS "superseded_by_contract_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN IF NOT EXISTS "reason_code" text DEFAULT 'system.initial' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD COLUMN IF NOT EXISTS "source_reference" text;
--> statement-breakpoint
UPDATE "hr_employment_contract"
SET
	"lineage_status" = COALESCE("lineage_status", 'active'),
	"reason_code" = COALESCE(NULLIF("reason_code", ''), 'system.initial')
WHERE "lineage_status" IS NULL OR "reason_code" IS NULL OR "reason_code" = '';
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ALTER COLUMN "reason_code" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded'));
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_supersedes_contract_id_hr_employment_contract_id_fk" FOREIGN KEY ("supersedes_contract_id") REFERENCES "public"."hr_employment_contract"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_superseded_by_contract_id_hr_employment_contract_id_fk" FOREIGN KEY ("superseded_by_contract_id") REFERENCES "public"."hr_employment_contract"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "hr_employment_contract_org_employment_ref_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_contract_org_employment_ref_active_uidx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","reference_code") WHERE "lineage_status" = 'active';
--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_employment_starts_idx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","starts_on");
