ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_valid_range_ck" CHECK ("valid_from" IS NULL OR "valid_to" IS NULL OR "valid_from" <= "valid_to");--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_valid_range_ck" CHECK ("valid_from" IS NULL OR "valid_to" IS NULL OR "valid_from" <= "valid_to");--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD CONSTRAINT "md_warehouse_external_id_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD CONSTRAINT "md_item_template_attribute_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD CONSTRAINT "md_item_template_attribute_option_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_status_ck" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_version_ck" CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_version_ck" CHECK ("version" > 0);--> statement-breakpoint

DROP INDEX IF EXISTS "md_item_barcode_org_symbology_normalized_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_active_identity_uidx"
	ON "md_item_barcode" USING btree ("organization_id", "symbology", "normalized_value")
	WHERE "status" = 'active' AND "archived_at" IS NULL;--> statement-breakpoint

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_item_alias"
		WHERE "status" = 'active' AND "archived_at" IS NULL
		GROUP BY
			"organization_id",
			"item_id",
			"alias_type",
			coalesce("language_id"::text, ''),
			"normalized_value"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot enforce md_item_alias active identity: resolve duplicate active aliases through @afenda/master-data';
	END IF;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX "md_item_alias_active_identity_uidx"
	ON "md_item_alias" USING btree (
		"organization_id",
		"item_id",
		"alias_type",
		coalesce("language_id"::text, ''),
		"normalized_value"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
