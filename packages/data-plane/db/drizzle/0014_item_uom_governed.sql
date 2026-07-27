DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_item_uom"
		WHERE "to_base_numerator" <= 0 OR "to_base_denominator" <= 0
	) THEN
		RAISE EXCEPTION 'Cannot migrate md_item_uom with non-positive conversion components';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "md_item_uom" DROP CONSTRAINT "md_item_uom_uom_id_ref_uom_id_fk";
--> statement-breakpoint
DROP INDEX "md_item_uom_uom_idx";
--> statement-breakpoint
DROP INDEX "md_item_uom_org_item_uom_usage_uidx";
--> statement-breakpoint
ALTER TABLE "md_item_uom" RENAME COLUMN "uom_id" TO "alternate_uom_id";
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "conversion_factor" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "rounding_scale" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "is_purchase_uom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "is_sales_uom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "is_inventory_uom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "is_default_purchase_uom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "is_default_sales_uom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "compatibility_mode" text;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "packaging_approval_reference" text;
--> statement-breakpoint
UPDATE "md_item_uom" AS conversion
SET
	"conversion_factor" = CASE
		WHEN conversion."alternate_uom_id" = item."base_uom_id" THEN 1
		ELSE conversion."to_base_numerator" / conversion."to_base_denominator"
	END,
	"is_purchase_uom" = conversion."usage" = 'purchase',
	"is_sales_uom" = conversion."usage" = 'sales',
	"is_inventory_uom" = conversion."alternate_uom_id" = item."base_uom_id",
	"compatibility_mode" = 'physical_dimension',
	"status" = CASE WHEN conversion."status" = 'retired' THEN 'archived' ELSE conversion."status" END
FROM "md_item" AS item
WHERE item."organization_id" = conversion."organization_id"
	AND item."id" = conversion."item_id";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "md_item_uom"
		WHERE "conversion_factor" IS NULL OR "conversion_factor" <= 0
	) THEN
		RAISE EXCEPTION 'Cannot migrate md_item_uom without a valid organization-owned item';
	END IF;
END $$;
--> statement-breakpoint
WITH ranked AS (
	SELECT
		"id",
		first_value("id") OVER (
			PARTITION BY "organization_id", "item_id", "alternate_uom_id"
			ORDER BY "created_at", "id"
		) AS survivor_id,
		row_number() OVER (
			PARTITION BY "organization_id", "item_id", "alternate_uom_id"
			ORDER BY "created_at", "id"
		) AS duplicate_rank,
		bool_or("is_purchase_uom") OVER (
			PARTITION BY "organization_id", "item_id", "alternate_uom_id"
		) AS any_purchase,
		bool_or("is_sales_uom") OVER (
			PARTITION BY "organization_id", "item_id", "alternate_uom_id"
		) AS any_sales,
		bool_or("is_inventory_uom") OVER (
			PARTITION BY "organization_id", "item_id", "alternate_uom_id"
		) AS any_inventory
	FROM "md_item_uom"
	WHERE "status" = 'active' AND "archived_at" IS NULL
), merged AS (
	UPDATE "md_item_uom" AS target
	SET
		"is_purchase_uom" = ranked."any_purchase",
		"is_sales_uom" = ranked."any_sales",
		"is_inventory_uom" = ranked."any_inventory",
		"updated_at" = now()
	FROM ranked
	WHERE target."id" = ranked."survivor_id" AND ranked."duplicate_rank" = 1
	RETURNING target."id"
)
UPDATE "md_item_uom" AS duplicate
SET
	"status" = 'inactive',
	"version" = duplicate."version" + 1,
	"updated_at" = now()
FROM ranked
WHERE duplicate."id" = ranked."id"
	AND ranked."duplicate_rank" > 1
	AND (SELECT count(*) FROM merged) >= 0;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ALTER COLUMN "conversion_factor" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ALTER COLUMN "compatibility_mode" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ALTER COLUMN "to_base_numerator" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ALTER COLUMN "to_base_denominator" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ALTER COLUMN "usage" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_alternate_uom_id_ref_uom_id_fk" FOREIGN KEY ("alternate_uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_factor_ck" CHECK ("conversion_factor" > 0);
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_rounding_scale_ck" CHECK ("rounding_scale" BETWEEN 0 AND 12);
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_default_purchase_ck" CHECK ("is_default_purchase_uom" = false OR "is_purchase_uom" = true);
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_default_sales_ck" CHECK ("is_default_sales_uom" = false OR "is_sales_uom" = true);
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_compatibility_mode_ck" CHECK ("compatibility_mode" IN ('physical_dimension', 'packaging_count'));
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_packaging_approval_ck" CHECK (("compatibility_mode" = 'packaging_count' AND "packaging_approval_reference" IS NOT NULL) OR ("compatibility_mode" = 'physical_dimension' AND "packaging_approval_reference" IS NULL));
--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_status_ck" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE INDEX "md_item_uom_uom_idx" ON "md_item_uom" USING btree ("alternate_uom_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_uom_active_item_alternate_uidx" ON "md_item_uom" USING btree ("organization_id", "item_id", "alternate_uom_id") WHERE "md_item_uom"."status" = 'active' AND "md_item_uom"."archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_uom_default_purchase_uidx" ON "md_item_uom" USING btree ("organization_id", "item_id") WHERE "md_item_uom"."is_default_purchase_uom" = true AND "md_item_uom"."status" = 'active' AND "md_item_uom"."archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_uom_default_sales_uidx" ON "md_item_uom" USING btree ("organization_id", "item_id") WHERE "md_item_uom"."is_default_sales_uom" = true AND "md_item_uom"."status" = 'active' AND "md_item_uom"."archived_at" IS NULL;
