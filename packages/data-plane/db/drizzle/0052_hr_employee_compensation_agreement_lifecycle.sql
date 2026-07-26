ALTER TABLE "hr_employee_compensation"
	ADD COLUMN "pay_frequency" text;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD COLUMN "confidential_note" text;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD COLUMN "supersedes_compensation_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD COLUMN "approved_by" text;--> statement-breakpoint
UPDATE "hr_employee_compensation"
SET "pay_frequency" = 'monthly'
WHERE "pay_frequency" IS NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ALTER COLUMN "pay_frequency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD CONSTRAINT "hr_employee_compensation_supersedes_compensation_id_hr_employee_compensation_id_fk"
	FOREIGN KEY ("supersedes_compensation_id") REFERENCES "public"."hr_employee_compensation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_scheduled_uidx"
	ON "hr_employee_compensation" USING btree ("organization_id", "employment_id")
	WHERE "hr_employee_compensation"."status" = 'scheduled';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_draft_uidx"
	ON "hr_employee_compensation" USING btree ("organization_id", "employment_id")
	WHERE "hr_employee_compensation"."status" = 'draft';
