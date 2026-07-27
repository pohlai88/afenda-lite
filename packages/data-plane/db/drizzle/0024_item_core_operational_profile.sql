ALTER TABLE "md_item" ADD COLUMN "description" text;
ALTER TABLE "md_item" ADD COLUMN "tracking_policy" text DEFAULT 'none' NOT NULL;
ALTER TABLE "md_item" ADD COLUMN "sellable" boolean DEFAULT true NOT NULL;
ALTER TABLE "md_item" ADD COLUMN "purchasable" boolean DEFAULT true NOT NULL;
ALTER TABLE "md_item" ADD COLUMN "stocked" boolean DEFAULT false NOT NULL;
ALTER TABLE "md_item" ADD COLUMN "service_indicator" boolean DEFAULT false NOT NULL;

UPDATE "md_item"
SET
	"stocked" = CASE
		WHEN "item_type" IN ('stock', 'asset_candidate') THEN true
		ELSE false
	END,
	"service_indicator" = CASE
		WHEN "item_type" = 'service' THEN true
		ELSE false
	END,
	"sellable" = CASE
		WHEN "item_type" IN ('asset_candidate', 'expense') THEN false
		ELSE true
	END,
	"purchasable" = true
WHERE true;

ALTER TABLE "md_item" ADD CONSTRAINT "md_item_tracking_policy_ck" CHECK ("tracking_policy" IN ('none', 'lot', 'serial', 'lot_and_serial'));
CREATE INDEX "md_item_org_operational_flags_idx" ON "md_item" USING btree ("organization_id", "sellable", "purchasable", "stocked", "service_indicator");
