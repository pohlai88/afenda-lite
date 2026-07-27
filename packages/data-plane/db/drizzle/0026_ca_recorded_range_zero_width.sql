ALTER TABLE "ca_company_jurisdiction_profile"
	DROP CONSTRAINT IF EXISTS "ca_company_jurisdiction_profile_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_jurisdiction_profile"
	ADD CONSTRAINT "ca_company_jurisdiction_profile_recorded_range_check"
	CHECK ("ca_company_jurisdiction_profile"."recorded_to" IS NULL OR "ca_company_jurisdiction_profile"."recorded_from" <= "ca_company_jurisdiction_profile"."recorded_to");
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	DROP CONSTRAINT IF EXISTS "ca_company_name_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	ADD CONSTRAINT "ca_company_name_recorded_range_check"
	CHECK ("ca_company_name"."recorded_to" IS NULL OR "ca_company_name"."recorded_from" <= "ca_company_name"."recorded_to");
--> statement-breakpoint
ALTER TABLE "ca_company_legal_form_history"
	DROP CONSTRAINT IF EXISTS "ca_company_legal_form_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_legal_form_history"
	ADD CONSTRAINT "ca_company_legal_form_recorded_range_check"
	CHECK ("ca_company_legal_form_history"."recorded_to" IS NULL OR "ca_company_legal_form_history"."recorded_from" <= "ca_company_legal_form_history"."recorded_to");
--> statement-breakpoint
ALTER TABLE "ca_company_identifier"
	DROP CONSTRAINT IF EXISTS "ca_company_identifier_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier"
	ADD CONSTRAINT "ca_company_identifier_recorded_range_check"
	CHECK ("ca_company_identifier"."recorded_to" IS NULL OR "ca_company_identifier"."recorded_from" <= "ca_company_identifier"."recorded_to");
--> statement-breakpoint
ALTER TABLE "ca_company_financial_year"
	DROP CONSTRAINT IF EXISTS "ca_company_financial_year_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_financial_year"
	ADD CONSTRAINT "ca_company_financial_year_recorded_range_check"
	CHECK ("ca_company_financial_year"."recorded_to" IS NULL OR "ca_company_financial_year"."recorded_from" <= "ca_company_financial_year"."recorded_to");
--> statement-breakpoint
ALTER TABLE "ca_company_activity"
	DROP CONSTRAINT IF EXISTS "ca_company_activity_recorded_range_check";
--> statement-breakpoint
ALTER TABLE "ca_company_activity"
	ADD CONSTRAINT "ca_company_activity_recorded_range_check"
	CHECK ("ca_company_activity"."recorded_to" IS NULL OR "ca_company_activity"."recorded_from" <= "ca_company_activity"."recorded_to");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ca_company_identifier_supersedes_once_uidx"
	ON "ca_company_identifier" ("organization_id", "legal_company_id", "supersedes_id")
	WHERE "supersedes_id" IS NOT NULL;
