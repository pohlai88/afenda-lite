-- Drop pre-hardening identifier columns superseded by jurisdiction_country_id / authority_party_id.
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" DROP COLUMN IF EXISTS "jurisdiction_code";
--> statement-breakpoint
ALTER TABLE "ca_company_identifier" DROP COLUMN IF EXISTS "issuing_authority";
