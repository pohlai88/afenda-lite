CREATE TABLE "hr_statutory_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"tax_residency_status" text NOT NULL,
	"nationality_country_code" text NOT NULL,
	"expatriate" boolean DEFAULT false NOT NULL,
	"minimum_wage_zone" text,
	"tax_file_number" text,
	"employee_provident_fund_number" text,
	"social_security_number" text,
	"social_insurance_book_number" text,
	"dependant_count" integer DEFAULT 0 NOT NULL,
	"relief_declaration_version" text NOT NULL,
	"relief_declarations" jsonb NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_statutory_profile_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_statutory_profile_jurisdiction_check" CHECK ("jurisdiction_code" IN ('MY', 'VN')),
	CONSTRAINT "hr_statutory_profile_residency_check" CHECK ("tax_residency_status" IN ('resident', 'non_resident')),
	CONSTRAINT "hr_statutory_profile_status_check" CHECK ("status" IN ('active', 'superseded')),
	CONSTRAINT "hr_statutory_profile_minimum_wage_zone_check" CHECK ("minimum_wage_zone" IS NULL OR ("jurisdiction_code" = 'VN' AND "minimum_wage_zone" IN ('I', 'II', 'III', 'IV'))),
	CONSTRAINT "hr_statutory_profile_dependant_count_check" CHECK ("dependant_count" >= 0),
	CONSTRAINT "hr_statutory_profile_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "hr_statutory_profile_supersession_check" CHECK (("status" = 'superseded' AND "effective_to" IS NOT NULL) OR "status" = 'active')
);
--> statement-breakpoint
CREATE TABLE "hr_prior_employer_ytd" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"tax_year" integer NOT NULL,
	"prior_employer_name" text,
	"gross_amount" text NOT NULL,
	"tax_withheld_amount" text NOT NULL,
	"statutory_contribution_amount" text NOT NULL,
	"currency_code" text NOT NULL,
	"recorded_on" date NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_prior_employer_ytd_jurisdiction_check" CHECK ("jurisdiction_code" IN ('MY', 'VN')),
	CONSTRAINT "hr_prior_employer_ytd_tax_year_check" CHECK ("tax_year" BETWEEN 1900 AND 9999),
	CONSTRAINT "hr_prior_employer_ytd_currency_check" CHECK (char_length("currency_code") = 3)
);
--> statement-breakpoint
CREATE INDEX "hr_statutory_profile_org_id_idx" ON "hr_statutory_profile" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_statutory_profile_org_employee_idx" ON "hr_statutory_profile" ("organization_id","employee_id","effective_from");
--> statement-breakpoint
ALTER TABLE "hr_statutory_profile" ADD CONSTRAINT "hr_statutory_profile_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_statutory_profile_org_create_idempotency_uidx" ON "hr_statutory_profile" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_statutory_profile_org_employee_open_uidx" ON "hr_statutory_profile" ("organization_id","employee_id") WHERE "effective_to" IS NULL AND "status" = 'active';
--> statement-breakpoint
CREATE INDEX "hr_prior_employer_ytd_org_id_idx" ON "hr_prior_employer_ytd" ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_prior_employer_ytd_org_employee_idx" ON "hr_prior_employer_ytd" ("organization_id","employee_id","tax_year");
--> statement-breakpoint
ALTER TABLE "hr_prior_employer_ytd" ADD CONSTRAINT "hr_prior_employer_ytd_org_id_uidx" UNIQUE ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_prior_employer_ytd_org_create_idempotency_uidx" ON "hr_prior_employer_ytd" ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_prior_employer_ytd_org_employee_year_uidx" ON "hr_prior_employer_ytd" ("organization_id","employee_id","tax_year","jurisdiction_code");
--> statement-breakpoint
ALTER TABLE "hr_statutory_profile" ADD CONSTRAINT "hr_statutory_profile_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "hr_employee"("organization_id","id");
--> statement-breakpoint
ALTER TABLE "hr_prior_employer_ytd" ADD CONSTRAINT "hr_prior_employer_ytd_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "hr_employee"("organization_id","id");
