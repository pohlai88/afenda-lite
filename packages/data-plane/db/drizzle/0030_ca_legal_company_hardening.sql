ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fiscal_month_check" CHECK ("fiscal_year_end_month" IS NULL OR ("fiscal_year_end_month" >= 1 AND "fiscal_year_end_month" <= 12));
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fiscal_day_check" CHECK ("fiscal_year_end_day" IS NULL OR ("fiscal_year_end_day" >= 1 AND "fiscal_year_end_day" <= 31));
--> statement-breakpoint
ALTER TABLE "ca_legal_company" ADD CONSTRAINT "ca_legal_company_fiscal_pair_check" CHECK (
	("fiscal_year_end_month" IS NULL AND "fiscal_year_end_day" IS NULL)
	OR ("fiscal_year_end_month" IS NOT NULL AND "fiscal_year_end_day" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ca_company_name" ADD CONSTRAINT "ca_company_name_supersedes_id_ca_company_name_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."ca_company_name"("id") ON DELETE no action ON UPDATE no action;
