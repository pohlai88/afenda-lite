-- CA-8 performance indexes for compliance search and cross-slice list paths
CREATE INDEX IF NOT EXISTS "ca_legal_company_org_code_idx" ON "ca_legal_company" USING btree ("organization_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_share_transaction_org_date_idx" ON "ca_share_transaction" USING btree ("organization_id","transaction_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_beneficial_owner_disclosure_org_effective_idx" ON "ca_beneficial_owner_disclosure" USING btree ("organization_id","effective_from","effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_property_holding_org_status_idx" ON "ca_property_holding" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_corporate_asset_org_status_idx" ON "ca_corporate_asset" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_intellectual_property_right_org_expiry_idx" ON "ca_intellectual_property_right" USING btree ("organization_id","expiry_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_insurance_policy_org_effective_idx" ON "ca_insurance_policy" USING btree ("organization_id","effective_from","effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_licence_permit_org_effective_idx" ON "ca_licence_permit" USING btree ("organization_id","effective_from","effective_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_bank_account_registration_org_status_idx" ON "ca_bank_account_registration" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_material_agreement_org_status_idx" ON "ca_material_agreement" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ca_filing_obligation_org_company_due_idx" ON "ca_filing_obligation" USING btree ("organization_id","legal_company_id","due_date");
