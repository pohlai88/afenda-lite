DROP INDEX "md_item_barcode_org_barcode_uidx";
--> statement-breakpoint
DROP INDEX "md_item_barcode_primary_item_uidx";
--> statement-breakpoint
ALTER TABLE "md_item_barcode" RENAME COLUMN "barcode" TO "barcode_value";
--> statement-breakpoint
ALTER TABLE "md_item_barcode" RENAME COLUMN "barcode_type" TO "symbology";
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "normalized_value" text;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "uom_id" uuid;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "pack_quantity" numeric(24, 12);
--> statement-breakpoint
UPDATE "md_item_barcode"
SET
	"symbology" = CASE
		WHEN upper("symbology") IN ('EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'GTIN_14', 'CODE_128', 'QR', 'INTERNAL', 'OTHER')
			THEN upper("symbology")
		ELSE 'OTHER'
	END,
	"status" = CASE
		WHEN "status" = 'draft' THEN 'pending'
		WHEN "status" = 'inactive' THEN 'expired'
		WHEN "status" = 'retired' THEN 'archived'
		WHEN "status" IN ('pending', 'active', 'expired', 'revoked', 'archived') THEN "status"
		ELSE 'active'
	END;
--> statement-breakpoint
UPDATE "md_item_barcode"
SET "normalized_value" = CASE
	WHEN "symbology" IN ('EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'GTIN_14')
		THEN regexp_replace("barcode_value", '[[:space:]-]', '', 'g')
	ELSE btrim("barcode_value")
END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "md_item_barcode"
		WHERE "normalized_value" IS NULL OR "normalized_value" = ''
	) THEN
		RAISE EXCEPTION 'Cannot migrate blank md_item_barcode values';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "md_item_barcode"
		GROUP BY "organization_id", "symbology", "normalized_value"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot migrate duplicate normalized md_item_barcode identities';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ALTER COLUMN "normalized_value" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ALTER COLUMN "symbology" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_uom_id_ref_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_symbology_ck" CHECK ("symbology" IN ('EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'GTIN_14', 'CODE_128', 'QR', 'INTERNAL', 'OTHER'));
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_pack_ck" CHECK (("uom_id" IS NULL AND "pack_quantity" IS NULL) OR ("uom_id" IS NOT NULL AND "pack_quantity" > 0));
--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_status_ck" CHECK ("status" IN ('pending', 'active', 'expired', 'revoked', 'archived'));
--> statement-breakpoint
CREATE INDEX "md_item_barcode_uom_idx" ON "md_item_barcode" USING btree ("uom_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_org_symbology_normalized_uidx" ON "md_item_barcode" USING btree ("organization_id", "symbology", "normalized_value");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_primary_item_uidx" ON "md_item_barcode" USING btree ("organization_id", "item_id") WHERE "md_item_barcode"."is_primary" = true AND "md_item_barcode"."status" = 'active' AND "md_item_barcode"."archived_at" IS NULL;
