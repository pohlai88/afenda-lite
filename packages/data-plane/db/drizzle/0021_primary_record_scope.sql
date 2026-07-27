DROP INDEX "md_item_barcode_primary_item_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_primary_item_uom_uidx" ON "md_item_barcode" USING btree ("organization_id", "item_id", coalesce("uom_id"::text, '')) WHERE "md_item_barcode"."is_primary" = true AND "md_item_barcode"."status" = 'active' AND "md_item_barcode"."archived_at" IS NULL;
