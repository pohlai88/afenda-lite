ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_group" ADD CONSTRAINT "md_item_group_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_warehouse" ADD CONSTRAINT "md_warehouse_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_payment_term" ADD CONSTRAINT "md_payment_term_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_template" ADD CONSTRAINT "md_item_template_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_change_request" ADD CONSTRAINT "md_change_request_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_group" ADD CONSTRAINT "md_item_group_org_id_uidx" UNIQUE ("organization_id", "id");--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_merged_into_org_fk" FOREIGN KEY ("organization_id","merged_into_id") REFERENCES "md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party" VALIDATE CONSTRAINT "md_party_merged_into_org_fk";--> statement-breakpoint
ALTER TABLE "md_item_group" ADD CONSTRAINT "md_item_group_org_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "md_item_group"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_group" VALIDATE CONSTRAINT "md_item_group_org_parent_fk";--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_org_group_fk" FOREIGN KEY ("organization_id","item_group_id") REFERENCES "md_item_group"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item" VALIDATE CONSTRAINT "md_item_org_group_fk";--> statement-breakpoint
ALTER TABLE "md_warehouse" ADD CONSTRAINT "md_warehouse_org_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "md_warehouse"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_warehouse" VALIDATE CONSTRAINT "md_warehouse_org_parent_fk";--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_org_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_tax_registration" VALIDATE CONSTRAINT "md_tax_registration_org_party_fk";
