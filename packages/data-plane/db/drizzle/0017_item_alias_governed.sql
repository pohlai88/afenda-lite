DROP INDEX "md_item_alias_org_normalized_live_uidx";
--> statement-breakpoint
ALTER TABLE "md_item_alias" RENAME COLUMN "alias_code" TO "alias_value";
--> statement-breakpoint
ALTER TABLE "md_item_alias" RENAME COLUMN "normalized_alias" TO "normalized_value";
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "alias_type" text;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "language_id" uuid;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "source" text;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "is_searchable" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "md_item_alias"
SET
	"alias_value" = regexp_replace(btrim("alias_value"), '[[:space:]]+', ' ', 'g'),
	"normalized_value" = lower(regexp_replace(btrim("alias_value"), '[[:space:]]+', ' ', 'g')),
	"alias_type" = 'legacy_name',
	"source" = 'legacy',
	"status" = CASE
		WHEN "retired_at" IS NOT NULL OR "status" = 'retired' THEN 'archived'
		WHEN "status" IN ('draft', 'active', 'inactive', 'archived') THEN "status"
		ELSE 'active'
	END,
	"archived_at" = CASE
		WHEN "retired_at" IS NOT NULL THEN COALESCE("archived_at", "retired_at")
		ELSE "archived_at"
	END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "md_item_alias"
		WHERE "alias_value" = '' OR "normalized_value" = ''
	) THEN
		RAISE EXCEPTION 'Cannot migrate blank md_item_alias values';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ALTER COLUMN "alias_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ALTER COLUMN "source" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_language_id_ref_language_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."ref_language"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_type_ck" CHECK ("alias_type" IN ('short_name', 'commercial_name', 'supplier_name', 'customer_name', 'legacy_name', 'local_name', 'scientific_name', 'search_keyword', 'other'));
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_source_ck" CHECK ("source" ~ '^[a-z0-9._-]+$');
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_status_ck" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE INDEX "md_item_alias_org_search_idx" ON "md_item_alias" USING btree ("organization_id", "normalized_value", "alias_type", "language_id");
--> statement-breakpoint
CREATE INDEX "md_item_alias_language_idx" ON "md_item_alias" USING btree ("language_id");
