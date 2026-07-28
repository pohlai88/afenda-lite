-- Forward repair for an out-of-order production Drizzle ledger.
-- Generated from the immutable historical migrations listed below.

-- BEGIN 0005_uneven_rage
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_exactly_one_value_check" CHECK (("md_item_variant_attribute_value"."value_text" IS NOT NULL AND "md_item_variant_attribute_value"."option_id" IS NULL) OR ("md_item_variant_attribute_value"."value_text" IS NULL AND "md_item_variant_attribute_value"."option_id" IS NOT NULL));
-- END 0005_uneven_rage

-- BEGIN 0006_cynical_roxanne_simpson
ALTER TABLE "md_item_alias" DROP CONSTRAINT "md_item_alias_item_id_md_item_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_barcode" DROP CONSTRAINT "md_item_barcode_item_id_md_item_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" DROP CONSTRAINT "md_item_external_id_item_id_md_item_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" DROP CONSTRAINT "md_item_template_attribute_template_id_md_item_template_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" DROP CONSTRAINT "md_item_template_attribute_option_attribute_id_md_item_template_attribute_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_uom" DROP CONSTRAINT "md_item_uom_item_id_md_item_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant" DROP CONSTRAINT "md_item_variant_item_id_md_item_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant" DROP CONSTRAINT "md_item_variant_template_id_md_item_template_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" DROP CONSTRAINT "md_item_variant_attribute_value_variant_id_md_item_variant_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" DROP CONSTRAINT "md_item_variant_attribute_value_attribute_id_md_item_template_attribute_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" DROP CONSTRAINT "md_item_variant_attribute_value_option_id_md_item_template_attribute_option_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_address" DROP CONSTRAINT "md_party_address_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_contact" DROP CONSTRAINT "md_party_contact_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" DROP CONSTRAINT "md_party_external_id_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" DROP CONSTRAINT "md_party_relationship_from_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" DROP CONSTRAINT "md_party_relationship_to_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_party_role" DROP CONSTRAINT "md_party_role_party_id_md_party_id_fk";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" DROP CONSTRAINT "md_warehouse_external_id_warehouse_id_md_warehouse_id_fk";
--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_item_template" ADD CONSTRAINT "md_item_template_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD CONSTRAINT "md_item_template_attribute_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD CONSTRAINT "md_item_template_attribute_option_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_warehouse" ADD CONSTRAINT "md_warehouse_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_org_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_org_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_org_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD CONSTRAINT "md_item_template_attribute_org_template_fk" FOREIGN KEY ("organization_id","template_id") REFERENCES "public"."md_item_template"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD CONSTRAINT "md_item_template_attribute_option_org_attribute_fk" FOREIGN KEY ("organization_id","attribute_id") REFERENCES "public"."md_item_template_attribute"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_org_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_org_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_org_template_fk" FOREIGN KEY ("organization_id","template_id") REFERENCES "public"."md_item_template"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_org_variant_fk" FOREIGN KEY ("organization_id","variant_id") REFERENCES "public"."md_item_variant"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_org_attribute_fk" FOREIGN KEY ("organization_id","attribute_id") REFERENCES "public"."md_item_template_attribute"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_org_option_fk" FOREIGN KEY ("organization_id","option_id") REFERENCES "public"."md_item_template_attribute_option"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_org_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_org_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_org_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_org_from_fk" FOREIGN KEY ("organization_id","from_party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_org_to_fk" FOREIGN KEY ("organization_id","to_party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_org_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD CONSTRAINT "md_warehouse_external_id_org_warehouse_fk" FOREIGN KEY ("organization_id","warehouse_id") REFERENCES "public"."md_warehouse"("organization_id","id") ON DELETE no action ON UPDATE no action NOT VALID;
--> statement-breakpoint
ALTER TABLE "md_party_role" VALIDATE CONSTRAINT "md_party_role_org_party_fk";
--> statement-breakpoint
ALTER TABLE "md_party_address" VALIDATE CONSTRAINT "md_party_address_org_party_fk";
--> statement-breakpoint
ALTER TABLE "md_party_contact" VALIDATE CONSTRAINT "md_party_contact_org_party_fk";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" VALIDATE CONSTRAINT "md_party_external_id_org_party_fk";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" VALIDATE CONSTRAINT "md_party_relationship_org_from_fk";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" VALIDATE CONSTRAINT "md_party_relationship_org_to_fk";
--> statement-breakpoint
ALTER TABLE "md_item_uom" VALIDATE CONSTRAINT "md_item_uom_org_item_fk";
--> statement-breakpoint
ALTER TABLE "md_item_barcode" VALIDATE CONSTRAINT "md_item_barcode_org_item_fk";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" VALIDATE CONSTRAINT "md_item_external_id_org_item_fk";
--> statement-breakpoint
ALTER TABLE "md_item_alias" VALIDATE CONSTRAINT "md_item_alias_org_item_fk";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" VALIDATE CONSTRAINT "md_warehouse_external_id_org_warehouse_fk";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" VALIDATE CONSTRAINT "md_item_template_attribute_org_template_fk";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" VALIDATE CONSTRAINT "md_item_template_attribute_option_org_attribute_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant" VALIDATE CONSTRAINT "md_item_variant_org_item_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant" VALIDATE CONSTRAINT "md_item_variant_org_template_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" VALIDATE CONSTRAINT "md_item_variant_attribute_value_org_variant_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" VALIDATE CONSTRAINT "md_item_variant_attribute_value_org_attribute_fk";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" VALIDATE CONSTRAINT "md_item_variant_attribute_value_org_option_fk";
-- END 0006_cynical_roxanne_simpson

-- BEGIN 0007_rich_proudstar
CREATE UNIQUE INDEX "md_item_barcode_primary_item_uidx" ON "md_item_barcode" USING btree ("organization_id","item_id") WHERE "md_item_barcode"."is_primary" = true AND "md_item_barcode"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_address_primary_type_uidx" ON "md_party_address" USING btree ("organization_id","party_id","address_type") WHERE "md_party_address"."is_default" = true AND "md_party_address"."archived_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_contact_primary_type_purpose_uidx" ON "md_party_contact" USING btree ("organization_id","party_id","contact_type",coalesce("purpose", '')) WHERE "md_party_contact"."is_primary" = true AND "md_party_contact"."archived_at" IS NULL;
-- END 0007_rich_proudstar

-- BEGIN 0008_cloudy_strong_guy
UPDATE "md_party_role"
SET
	"status" = 'archived',
	"archived_at" = COALESCE("archived_at", "retired_at", now()),
	"archived_by" = COALESCE("archived_by", "retired_by", "updated_by")
WHERE "status" = 'retired';--> statement-breakpoint
DROP INDEX "md_party_role_org_party_code_live_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_role_org_party_code_live_uidx" ON "md_party_role" USING btree ("organization_id","party_id","role_code") WHERE "md_party_role"."archived_at" IS NULL;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_status_check" CHECK ("md_party_role"."status" IN ('draft', 'active', 'inactive', 'retired', 'archived'));
-- END 0008_cloudy_strong_guy

-- BEGIN 0009_lively_paibok
DROP INDEX "md_party_role_org_party_code_live_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_role_org_party_code_active_uidx" ON "md_party_role" USING btree ("organization_id","party_id","role_code") WHERE "md_party_role"."status" = 'active' AND "md_party_role"."archived_at" IS NULL;
-- END 0009_lively_paibok

-- BEGIN 0010_party_address_structured
DROP INDEX IF EXISTS "md_party_address_primary_type_uidx";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "region" TO "administrative_area";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "is_default" TO "is_primary";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "verification_status" TO "validation_status";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "valid_from" TO "effective_from";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "valid_to" TO "effective_to";--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "line3" text;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "attention" text;--> statement-breakpoint
UPDATE "md_party_address"
SET "purpose" = CASE lower("address_type")
	WHEN 'registered' THEN 'registered'
	WHEN 'billing' THEN 'billing'
	WHEN 'shipping' THEN 'shipping'
	WHEN 'operational' THEN 'operational'
	ELSE 'other'
END,
"address_type" = CASE lower("address_type")
	WHEN 'physical' THEN 'physical'
	WHEN 'postal' THEN 'postal'
	WHEN 'registered' THEN 'registered'
	WHEN 'billing' THEN 'billing'
	WHEN 'shipping' THEN 'shipping'
	WHEN 'operational' THEN 'operational'
	ELSE 'physical'
END,
"validation_status" = CASE lower("validation_status")
	WHEN 'verified' THEN 'validated'
	WHEN 'validated' THEN 'validated'
	WHEN 'invalid' THEN 'invalid'
	ELSE 'unvalidated'
END;--> statement-breakpoint
ALTER TABLE "md_party_address" ALTER COLUMN "purpose" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "md_party_address" ALTER COLUMN "validation_status" SET DEFAULT 'unvalidated';--> statement-breakpoint
WITH ranked_primary AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "organization_id", "party_id", "purpose"
		ORDER BY "updated_at" DESC, "id"
	) AS priority
	FROM "md_party_address"
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_address" AS address
SET "is_primary" = false,
	"version" = address."version" + 1,
	"updated_at" = now()
FROM ranked_primary
WHERE address."id" = ranked_primary."id" AND ranked_primary.priority > 1;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_type_check" CHECK ("address_type" IN ('physical', 'postal', 'registered', 'billing', 'shipping', 'operational'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_purpose_check" CHECK ("purpose" IN ('registered', 'billing', 'shipping', 'correspondence', 'operational', 'returns', 'tax', 'other'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_validation_status_check" CHECK ("validation_status" IN ('unvalidated', 'validated', 'invalid'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_status_check" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_effective_range_check" CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_from" <= "effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_address_primary_purpose_active_uidx" ON "md_party_address" USING btree ("organization_id", "party_id", "purpose") WHERE "md_party_address"."is_primary" = true AND "md_party_address"."status" = 'active' AND "md_party_address"."archived_at" IS NULL;
-- END 0010_party_address_structured

-- BEGIN 0011_party_contact_structured
DROP INDEX IF EXISTS "md_party_contact_primary_type_purpose_uidx";--> statement-breakpoint
ALTER TABLE "md_party_contact" RENAME COLUMN "valid_from" TO "effective_from";--> statement-breakpoint
ALTER TABLE "md_party_contact" RENAME COLUMN "valid_to" TO "effective_to";--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "normalized_value" text;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "md_party_contact"
SET "normalized_value" = CASE lower("contact_type")
	WHEN 'email' THEN
		CASE WHEN position('@' in trim("value")) > 1
			THEN split_part(trim("value"), '@', 1) || '@' || lower(split_part(trim("value"), '@', 2))
			ELSE trim("value")
		END
	WHEN 'telephone' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'mobile' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'fax' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'website' THEN
		CASE WHEN position('://' in trim("value")) > 0
			THEN lower(split_part(trim("value"), '://', 1)) || '://' ||
				lower(split_part(split_part(trim("value"), '://', 2), '/', 1)) ||
				CASE WHEN position('/' in split_part(trim("value"), '://', 2)) > 0
					THEN substring(split_part(trim("value"), '://', 2) from position('/' in split_part(trim("value"), '://', 2)))
					ELSE ''
				END
			ELSE trim("value")
		END
	ELSE trim("value")
END,
"contact_type" = CASE lower("contact_type")
	WHEN 'email' THEN 'email'
	WHEN 'telephone' THEN 'telephone'
	WHEN 'mobile' THEN 'mobile'
	WHEN 'fax' THEN 'fax'
	WHEN 'website' THEN 'website'
	WHEN 'messaging' THEN 'messaging'
	ELSE 'other'
END,
"purpose" = nullif(lower(trim("purpose")), ''),
"verification_status" = CASE lower("verification_status")
	WHEN 'pending' THEN 'pending'
	WHEN 'failed' THEN 'failed'
	ELSE 'unverified'
END,
"status" = CASE lower("status")
	WHEN 'draft' THEN 'draft'
	WHEN 'active' THEN 'active'
	WHEN 'inactive' THEN 'inactive'
	WHEN 'archived' THEN 'archived'
	ELSE 'inactive'
END;--> statement-breakpoint
ALTER TABLE "md_party_contact" ALTER COLUMN "normalized_value" SET NOT NULL;--> statement-breakpoint
WITH ranked_primary AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "organization_id", "party_id", "contact_type", coalesce("purpose", '')
		ORDER BY "updated_at" DESC, "id"
	) AS priority
	FROM "md_party_contact"
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_contact" AS contact
SET "is_primary" = false,
	"version" = contact."version" + 1,
	"updated_at" = now()
FROM ranked_primary
WHERE contact."id" = ranked_primary."id" AND ranked_primary.priority > 1;--> statement-breakpoint
CREATE INDEX "md_party_contact_org_normalized_value_idx" ON "md_party_contact" USING btree ("organization_id", "contact_type", "normalized_value");--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_type_check" CHECK ("contact_type" IN ('email', 'telephone', 'mobile', 'fax', 'website', 'messaging', 'other'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_verification_status_check" CHECK ("verification_status" IN ('unverified', 'pending', 'verified', 'failed'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_verification_timestamp_check" CHECK (("verification_status" = 'verified' AND "verified_at" IS NOT NULL) OR ("verification_status" <> 'verified' AND "verified_at" IS NULL));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_status_check" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_effective_range_check" CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_from" <= "effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_contact_primary_type_purpose_uidx" ON "md_party_contact" USING btree ("organization_id", "party_id", "contact_type", coalesce("purpose", '')) WHERE "md_party_contact"."is_primary" = true AND "md_party_contact"."status" = 'active' AND "md_party_contact"."archived_at" IS NULL;
-- END 0011_party_contact_structured

-- BEGIN 0012_party_external_id_structured
ALTER TABLE "md_party_external_id" RENAME COLUMN "system" TO "source_system";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" RENAME COLUMN "namespace" TO "external_id_type";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" RENAME COLUMN "external_id" TO "external_value";
--> statement-breakpoint
UPDATE "md_party_external_id"
SET "source_system" = lower(trim("source_system")),
	"external_id_type" = CASE
		WHEN trim("external_id_type") = '' THEN 'legacy'
		ELSE lower(trim("external_id_type"))
	END;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "normalized_value" text;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "case_sensitivity" text DEFAULT 'sensitive' NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "md_party_external_id" SET "normalized_value" = "external_value";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ALTER COLUMN "normalized_value" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ALTER COLUMN "case_sensitivity" DROP DEFAULT;
--> statement-breakpoint
DROP INDEX "md_party_external_id_org_sys_ns_ext_uidx";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_case_sensitivity_ck"
	CHECK ("case_sensitivity" IN ('sensitive', 'insensitive'));
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_status_ck"
	CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_active_identity_uidx"
	ON "md_party_external_id" USING btree (
		"organization_id", "source_system", "external_id_type", "normalized_value"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_active_primary_uidx"
	ON "md_party_external_id" USING btree (
		"organization_id", "party_id", "source_system", "external_id_type"
	)
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL;
-- END 0012_party_external_id_structured

-- BEGIN 0013_party_relationship_governed
ALTER TABLE "md_party_relationship" RENAME COLUMN "from_party_id" TO "source_party_id";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "to_party_id" TO "target_party_id";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "valid_from" TO "effective_from";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "valid_to" TO "effective_to";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD COLUMN "direction" text;
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "direction" = CASE
	WHEN "relationship_type" IN ('parent_of', 'subsidiary_of') THEN 'hierarchical'
	WHEN "relationship_type" IN ('landlord_of', 'tenant_of') THEN 'reciprocal'
	WHEN "relationship_type" = 'related_party' THEN 'symmetric'
	ELSE 'directional'
END;
--> statement-breakpoint
DROP INDEX "md_party_relationship_org_pair_type_uidx";
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = "target_party_id",
	"target_party_id" = "source_party_id",
	"relationship_type" = 'parent_of'
WHERE "relationship_type" = 'subsidiary_of';
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = "target_party_id",
	"target_party_id" = "source_party_id",
	"relationship_type" = 'landlord_of'
WHERE "relationship_type" = 'tenant_of';
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = LEAST("source_party_id", "target_party_id"),
	"target_party_id" = GREATEST("source_party_id", "target_party_id")
WHERE "relationship_type" = 'related_party';
--> statement-breakpoint
WITH ranked AS (
	SELECT "id",
		row_number() OVER (
			PARTITION BY "organization_id", "source_party_id", "target_party_id", "relationship_type"
			ORDER BY "created_at", "id"
		) AS occurrence
	FROM "md_party_relationship"
	WHERE "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_relationship" AS relationship
SET "status" = 'inactive',
	"version" = "version" + 1,
	"updated_at" = now()
FROM ranked
WHERE ranked."id" = relationship."id" AND ranked.occurrence > 1;
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ALTER COLUMN "direction" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_non_reflexive_ck"
	CHECK ("source_party_id" <> "target_party_id");
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_direction_ck"
	CHECK ("direction" IN ('directional', 'reciprocal', 'hierarchical', 'symmetric'));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_type_ck"
	CHECK ("relationship_type" IN (
		'parent_of', 'owned_by', 'contact_for', 'bill_to_for', 'ship_to_for',
		'supplies', 'distributes_for', 'franchisee_of', 'related_party', 'landlord_of'
	));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_semantics_ck"
	CHECK (
		("relationship_type" = 'parent_of' AND "direction" = 'hierarchical')
		OR ("relationship_type" = 'landlord_of' AND "direction" = 'reciprocal')
		OR ("relationship_type" = 'related_party' AND "direction" = 'symmetric')
		OR ("relationship_type" IN (
			'owned_by', 'contact_for', 'bill_to_for', 'ship_to_for',
			'supplies', 'distributes_for', 'franchisee_of'
		) AND "direction" = 'directional')
	);
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_status_ck"
	CHECK ("status" IN ('draft', 'active', 'inactive', 'terminated', 'archived'));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_effective_range_ck"
	CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_relationship_active_pair_type_uidx"
	ON "md_party_relationship" USING btree (
		"organization_id", "source_party_id", "target_party_id", "relationship_type"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
-- END 0013_party_relationship_governed

-- BEGIN 0014_item_uom_governed
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
-- END 0014_item_uom_governed

-- BEGIN 0015_item_barcode_governed
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
-- END 0015_item_barcode_governed

-- BEGIN 0016_item_external_id_governed
DROP INDEX "md_item_external_id_org_sys_ns_ext_uidx";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" RENAME COLUMN "system" TO "source_system";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" RENAME COLUMN "namespace" TO "external_id_type";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" RENAME COLUMN "external_id" TO "external_value";
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "normalized_value" text;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "case_sensitivity" text;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "md_item_external_id"
SET
	"source_system" = lower(btrim("source_system")),
	"external_id_type" = CASE
		WHEN btrim("external_id_type") = '' THEN 'default'
		ELSE lower(btrim("external_id_type"))
	END,
	"external_value" = btrim("external_value"),
	"normalized_value" = btrim("external_value"),
	"case_sensitivity" = 'sensitive',
	"status" = CASE
		WHEN "status" IN ('retired', 'expired', 'revoked') THEN 'archived'
		WHEN "status" = 'pending' THEN 'draft'
		WHEN "status" IN ('draft', 'active', 'inactive', 'archived') THEN "status"
		ELSE 'active'
	END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "md_item_external_id"
		WHERE "source_system" !~ '^[a-z0-9._-]+$'
			OR "external_id_type" !~ '^[a-z0-9._-]+$'
			OR "external_value" = ''
	) THEN
		RAISE EXCEPTION 'Cannot migrate invalid md_item_external_id qualifiers or values';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "md_item_external_id"
		WHERE "status" = 'active' AND "archived_at" IS NULL
		GROUP BY "organization_id", "source_system", "external_id_type", "normalized_value"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot migrate duplicate active md_item_external_id identities';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ALTER COLUMN "external_id_type" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ALTER COLUMN "normalized_value" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ALTER COLUMN "case_sensitivity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_case_sensitivity_ck" CHECK ("case_sensitivity" IN ('sensitive', 'insensitive'));
--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_status_ck" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_external_id_active_identity_uidx" ON "md_item_external_id" USING btree ("organization_id", "source_system", "external_id_type", "normalized_value") WHERE "md_item_external_id"."status" = 'active' AND "md_item_external_id"."archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_external_id_active_primary_uidx" ON "md_item_external_id" USING btree ("organization_id", "item_id", "source_system", "external_id_type") WHERE "md_item_external_id"."is_primary" = true AND "md_item_external_id"."status" = 'active' AND "md_item_external_id"."archived_at" IS NULL;
-- END 0016_item_external_id_governed

-- BEGIN 0017_item_alias_governed
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
-- END 0017_item_alias_governed

-- BEGIN 0018_warehouse_external_id_governed
DROP INDEX IF EXISTS "md_warehouse_external_id_org_sys_ns_ext_uidx";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "system" TO "source_system";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "namespace" TO "external_id_type";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "external_id" TO "external_value";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ADD COLUMN "normalized_value" text,
	ADD COLUMN "case_sensitivity" text;
--> statement-breakpoint
UPDATE "md_warehouse_external_id"
SET
	"source_system" = lower(btrim("source_system")),
	"external_id_type" = CASE
		WHEN btrim("external_id_type") = '' THEN 'default'
		ELSE lower(btrim("external_id_type"))
	END,
	"external_value" = btrim("external_value"),
	"normalized_value" = btrim("external_value"),
	"case_sensitivity" = 'sensitive',
	"status" = CASE
		WHEN "status" IN ('draft', 'active', 'inactive', 'archived') THEN "status"
		WHEN "status" IN ('expired', 'revoked', 'terminated', 'retired') THEN 'archived'
		WHEN "status" = 'pending' THEN 'draft'
		ELSE 'active'
	END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_warehouse_external_id"
		WHERE "source_system" !~ '^[a-z0-9._-]+$'
			OR "external_id_type" !~ '^[a-z0-9._-]+$'
			OR "external_value" = ''
	) THEN
		RAISE EXCEPTION 'Warehouse external identifiers contain invalid qualifiers or empty values';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "md_warehouse_external_id"
		WHERE "status" = 'active' AND "archived_at" IS NULL
		GROUP BY "organization_id", "source_system", "external_id_type", "normalized_value"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Duplicate active warehouse external identifier identities must be resolved before migration';
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ALTER COLUMN "external_id_type" DROP DEFAULT,
	ALTER COLUMN "normalized_value" SET NOT NULL,
	ALTER COLUMN "case_sensitivity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ADD CONSTRAINT "md_warehouse_external_id_source_system_ck"
		CHECK ("source_system" ~ '^[a-z0-9._-]+$'),
	ADD CONSTRAINT "md_warehouse_external_id_type_ck"
		CHECK ("external_id_type" ~ '^[a-z0-9._-]+$'),
	ADD CONSTRAINT "md_warehouse_external_id_case_sensitivity_ck"
		CHECK ("case_sensitivity" IN ('sensitive', 'insensitive')),
	ADD CONSTRAINT "md_warehouse_external_id_status_ck"
		CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_external_id_active_identity_uidx"
	ON "md_warehouse_external_id" USING btree (
		"organization_id",
		"source_system",
		"external_id_type",
		"normalized_value"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
-- END 0018_warehouse_external_id_governed

-- BEGIN 0019_template_attribute_governed
ALTER TABLE "md_item_template_attribute"
	RENAME COLUMN "value_kind" TO "data_type";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute"
	RENAME COLUMN "sort_order" TO "display_order";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option"
	RENAME COLUMN "sort_order" TO "display_order";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute"
	ADD COLUMN "description" text,
	ADD COLUMN "is_variant_defining" boolean NOT NULL DEFAULT true,
	ADD COLUMN "is_searchable" boolean NOT NULL DEFAULT false,
	ADD COLUMN "validation_rules" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option"
	ADD COLUMN "description" text;
--> statement-breakpoint
UPDATE "md_item_template_attribute"
SET "data_type" = CASE "data_type"
	WHEN 'text' THEN 'text'
	WHEN 'option' THEN 'single_option'
	ELSE "data_type"
END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_item_template_attribute"
		WHERE "data_type" NOT IN (
			'text', 'integer', 'decimal', 'boolean', 'date',
			'single_option', 'multiple_option', 'reference'
		)
	) THEN
		RAISE EXCEPTION 'Unsupported item-template attribute data types must be resolved before migration';
	END IF;

	IF EXISTS (
		SELECT 1 FROM "md_item_template_attribute" WHERE "display_order" < 0
		UNION ALL
		SELECT 1 FROM "md_item_template_attribute_option" WHERE "display_order" < 0
	) THEN
		RAISE EXCEPTION 'Negative template attribute display orders must be resolved before migration';
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute"
	ADD CONSTRAINT "md_item_template_attribute_data_type_ck"
		CHECK ("data_type" IN (
			'text', 'integer', 'decimal', 'boolean', 'date',
			'single_option', 'multiple_option', 'reference'
		)),
	ADD CONSTRAINT "md_item_template_attribute_display_order_ck"
		CHECK ("display_order" >= 0),
	ADD CONSTRAINT "md_item_template_attribute_validation_rules_ck"
		CHECK (jsonb_typeof("validation_rules") = 'object'),
	ADD CONSTRAINT "md_item_template_attribute_status_ck"
		CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option"
	ADD CONSTRAINT "md_item_template_attribute_option_display_order_ck"
		CHECK ("display_order" >= 0),
	ADD CONSTRAINT "md_item_template_attribute_option_status_ck"
		CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
-- END 0019_template_attribute_governed

-- BEGIN 0020_variant_attribute_value_typed
ALTER TABLE "md_item_variant_attribute_value"
	RENAME COLUMN "value_text" TO "text_value";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value"
	ADD COLUMN "value_type" text,
	ADD COLUMN "integer_value" numeric(38, 0),
	ADD COLUMN "decimal_value" numeric(38, 18),
	ADD COLUMN "boolean_value" boolean,
	ADD COLUMN "date_value" date,
	ADD COLUMN "reference_value" text;
--> statement-breakpoint
UPDATE "md_item_variant_attribute_value" value
SET "value_type" = CASE
	WHEN value."option_id" IS NOT NULL THEN 'single_option'
	ELSE 'text'
END
FROM "md_item_template_attribute" attribute
WHERE attribute."organization_id" = value."organization_id"
	AND attribute."id" = value."attribute_id";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_item_variant_attribute_value"
		WHERE "value_type" IS NULL
	) THEN
		RAISE EXCEPTION 'Variant attribute values without a same-organization attribute must be resolved before migration';
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value"
	ALTER COLUMN "value_type" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "md_item_variant_attribute_value_org_variant_attr_uidx";
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value"
	DROP CONSTRAINT IF EXISTS "md_item_variant_attribute_value_exactly_one_value_check",
	DROP CONSTRAINT IF EXISTS "md_item_variant_attribute_value_org_option_fk";
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option"
	ADD CONSTRAINT "md_item_template_attribute_option_org_id_attr_uidx"
		UNIQUE ("organization_id", "id", "attribute_id");
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value"
	ADD CONSTRAINT "md_item_variant_attribute_value_org_id_attr_uidx"
		UNIQUE ("organization_id", "id", "attribute_id"),
	ADD CONSTRAINT "md_item_variant_attribute_value_org_option_fk"
		FOREIGN KEY ("organization_id", "option_id", "attribute_id")
		REFERENCES "md_item_template_attribute_option" (
			"organization_id", "id", "attribute_id"
		),
	ADD CONSTRAINT "md_item_variant_attribute_value_typed_value_ck"
		CHECK (
			("value_type" = 'text' AND "text_value" IS NOT NULL AND num_nonnulls("integer_value", "decimal_value", "boolean_value", "date_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'integer' AND "integer_value" IS NOT NULL AND num_nonnulls("text_value", "decimal_value", "boolean_value", "date_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'decimal' AND "decimal_value" IS NOT NULL AND num_nonnulls("text_value", "integer_value", "boolean_value", "date_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'boolean' AND "boolean_value" IS NOT NULL AND num_nonnulls("text_value", "integer_value", "decimal_value", "date_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'date' AND "date_value" IS NOT NULL AND num_nonnulls("text_value", "integer_value", "decimal_value", "boolean_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'single_option' AND "option_id" IS NOT NULL AND num_nonnulls("text_value", "integer_value", "decimal_value", "boolean_value", "date_value", "reference_value") = 0)
			OR ("value_type" = 'multiple_option' AND num_nonnulls("text_value", "integer_value", "decimal_value", "boolean_value", "date_value", "option_id", "reference_value") = 0)
			OR ("value_type" = 'reference' AND "reference_value" IS NOT NULL AND num_nonnulls("text_value", "integer_value", "decimal_value", "boolean_value", "date_value", "option_id") = 0)
		),
	ADD CONSTRAINT "md_item_variant_attribute_value_status_ck"
		CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_attribute_value_current_uidx"
	ON "md_item_variant_attribute_value" USING btree (
		"organization_id", "variant_id", "attribute_id"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
--> statement-breakpoint
CREATE TABLE "md_item_variant_attribute_value_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"value_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "md_item_variant_attribute_value_option_org_value_fk"
		FOREIGN KEY ("organization_id", "value_id", "attribute_id")
		REFERENCES "md_item_variant_attribute_value" (
			"organization_id", "id", "attribute_id"
		),
	CONSTRAINT "md_item_variant_attribute_value_option_org_option_fk"
		FOREIGN KEY ("organization_id", "option_id", "attribute_id")
		REFERENCES "md_item_template_attribute_option" (
			"organization_id", "id", "attribute_id"
		)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_attribute_value_option_identity_uidx"
	ON "md_item_variant_attribute_value_option" USING btree (
		"organization_id", "value_id", "option_id"
	);
--> statement-breakpoint
CREATE INDEX "md_item_variant_attribute_value_option_value_idx"
	ON "md_item_variant_attribute_value_option" USING btree (
		"organization_id", "value_id"
	);
-- END 0020_variant_attribute_value_typed

-- BEGIN 0021_primary_record_scope
DROP INDEX "md_item_barcode_primary_item_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_primary_item_uom_uidx" ON "md_item_barcode" USING btree ("organization_id", "item_id", coalesce("uom_id"::text, '')) WHERE "md_item_barcode"."is_primary" = true AND "md_item_barcode"."status" = 'active' AND "md_item_barcode"."archived_at" IS NULL;
-- END 0021_primary_record_scope

-- BEGIN 0022_extension_database_constraints
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
-- END 0022_extension_database_constraints

-- BEGIN 0024_item_core_operational_profile
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
-- END 0024_item_core_operational_profile

-- BEGIN 0025_warehouse_payment_tax_masters
ALTER TABLE "md_warehouse"
	ADD COLUMN IF NOT EXISTS "address_country_id" uuid,
	ADD COLUMN IF NOT EXISTS "address_line1" text,
	ADD COLUMN IF NOT EXISTS "address_line2" text,
	ADD COLUMN IF NOT EXISTS "address_city" text,
	ADD COLUMN IF NOT EXISTS "address_region" text,
	ADD COLUMN IF NOT EXISTS "address_postal_code" text;

DO $$ BEGIN
	ALTER TABLE "md_warehouse"
		ADD CONSTRAINT "md_warehouse_address_country_fk"
		FOREIGN KEY ("address_country_id") REFERENCES "ref_country"("id");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "md_warehouse_address_country_idx"
	ON "md_warehouse" ("address_country_id");

ALTER TABLE "md_payment_term"
	ADD COLUMN IF NOT EXISTS "discount_days" integer,
	ADD COLUMN IF NOT EXISTS "discount_percent" numeric(7, 4),
	ADD COLUMN IF NOT EXISTS "due_day_rule" text NOT NULL DEFAULT 'net_days',
	ADD COLUMN IF NOT EXISTS "end_of_month" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "installment_policy" text NOT NULL DEFAULT 'none',
	ADD COLUMN IF NOT EXISTS "installment_count" integer,
	ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "valid_to" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "currency_restriction_id" uuid;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_currency_restriction_fk"
		FOREIGN KEY ("currency_restriction_id") REFERENCES "ref_currency"("id");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "md_payment_term_currency_restriction_idx"
	ON "md_payment_term" ("currency_restriction_id");

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_net_days_ck"
		CHECK ("net_days" BETWEEN 0 AND 999);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_days_ck"
		CHECK ("discount_days" IS NULL OR ("discount_days" >= 0 AND "discount_days" <= "net_days"));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_percent_ck"
		CHECK ("discount_percent" IS NULL OR ("discount_percent" > 0 AND "discount_percent" <= 100));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_pair_ck"
		CHECK ("discount_percent" IS NULL OR "discount_days" IS NOT NULL);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_due_day_rule_ck"
		CHECK ("due_day_rule" IN ('net_days', 'end_of_month', 'day_of_month'));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_installment_policy_ck"
		CHECK ("installment_policy" IN ('none', 'equal_installments'));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_installment_count_ck"
		CHECK (("installment_policy" = 'none' AND "installment_count" IS NULL) OR ("installment_policy" = 'equal_installments' AND "installment_count" >= 2));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_validity_range_ck"
		CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to" >= "valid_from");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
-- END 0025_warehouse_payment_tax_masters

-- BEGIN 0027_master_data_database_constraints
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
-- END 0027_master_data_database_constraints

-- BEGIN 0028_ca_company_status_lifecycle
ALTER TABLE ca_legal_company
	DROP CONSTRAINT IF EXISTS ca_legal_company_state_check;--> statement-breakpoint

ALTER TABLE ca_legal_company
	ADD CONSTRAINT ca_legal_company_state_check
	CHECK (state IN (
		'draft',
		'active',
		'suspended',
		'struck_off',
		'in_liquidation',
		'dissolved',
		'restored',
		'archived'
	));--> statement-breakpoint

CREATE TABLE IF NOT EXISTS ca_company_status_history (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	organization_id text NOT NULL,
	legal_company_id uuid NOT NULL,
	status text NOT NULL,
	effective_from date NOT NULL,
	effective_to date,
	recorded_at timestamp with time zone NOT NULL,
	recorded_by text NOT NULL,
	reason text,
	source_document_id text NOT NULL,
	version integer DEFAULT 1 NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT ca_company_status_value_check CHECK (status IN (
		'draft',
		'active',
		'suspended',
		'struck_off',
		'in_liquidation',
		'dissolved',
		'restored',
		'archived'
	)),
	CONSTRAINT ca_company_status_effective_range_check CHECK (
		effective_to IS NULL OR effective_from < effective_to
	),
	CONSTRAINT ca_company_status_source_check CHECK (
		char_length(btrim(source_document_id)) > 0
	),
	CONSTRAINT ca_company_status_reason_check CHECK (
		reason IS NULL OR char_length(btrim(reason)) > 0
	),
	CONSTRAINT ca_company_status_version_check CHECK (version > 0)
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS ca_company_status_version_uidx
	ON ca_company_status_history (organization_id, legal_company_id, version);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ca_company_status_as_of_idx
	ON ca_company_status_history (
		organization_id,
		legal_company_id,
		effective_from,
		effective_to,
		recorded_at
	);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ca_company_status_value_idx
	ON ca_company_status_history (
		organization_id,
		status,
		effective_from,
		effective_to
	);
-- END 0028_ca_company_status_lifecycle

-- BEGIN 0029_master_data_import_recovery
ALTER TABLE md_import_batch
	DROP CONSTRAINT IF EXISTS md_import_batch_status_ck;--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD COLUMN IF NOT EXISTS payload_hash text,
	ADD COLUMN IF NOT EXISTS operation_type text,
	ADD COLUMN IF NOT EXISTS lease_owner text,
	ADD COLUMN IF NOT EXISTS lease_expires_at timestamp with time zone,
	ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;--> statement-breakpoint

UPDATE md_import_batch
SET
	payload_hash = COALESCE(payload_hash, 'legacy:' || id::text),
	operation_type = COALESCE(operation_type, 'upsert_' || entity_type || '_by_code'),
	status = CASE status
		WHEN 'draft' THEN 'claimed'
		WHEN 'submitted' THEN 'approval_pending'
		WHEN 'rejected' THEN 'cancelled'
		WHEN 'expired' THEN 'cancelled'
		WHEN 'superseded' THEN 'cancelled'
		ELSE status
	END,
	completed_at = CASE
		WHEN status = 'applied' THEN COALESCE(completed_at, updated_at)
		ELSE completed_at
	END
WHERE payload_hash IS NULL
	OR operation_type IS NULL
	OR status IN ('draft', 'submitted', 'rejected', 'expired', 'superseded')
	OR (status = 'applied' AND completed_at IS NULL);--> statement-breakpoint

ALTER TABLE md_import_batch
	ALTER COLUMN payload_hash SET NOT NULL,
	ALTER COLUMN operation_type SET NOT NULL,
	ALTER COLUMN status SET DEFAULT 'claimed';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS md_import_batch_org_id_uidx
	ON md_import_batch (organization_id, id);--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD CONSTRAINT md_import_batch_status_ck
	CHECK (status IN (
		'claimed',
		'validating',
		'approval_pending',
		'approved',
		'applying',
		'partially_applied',
		'applied',
		'failed',
		'cancelled'
	));--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD CONSTRAINT md_import_batch_lease_ck
	CHECK (
		(lease_owner IS NULL AND lease_expires_at IS NULL)
		OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
	);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS md_import_batch_row (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	organization_id text NOT NULL,
	batch_id uuid NOT NULL,
	source_row_number integer NOT NULL,
	payload_hash text NOT NULL,
	normalized_payload jsonb NOT NULL,
	intended_operation text,
	matched_entity_id uuid,
	status text DEFAULT 'pending' NOT NULL,
	error_code text,
	error_details jsonb,
	result_entity_id uuid,
	result_version integer,
	attempt_count integer DEFAULT 0 NOT NULL,
	lease_owner text,
	lease_expires_at timestamp with time zone,
	started_at timestamp with time zone,
	completed_at timestamp with time zone,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT md_import_batch_row_org_batch_fk
		FOREIGN KEY (organization_id, batch_id)
		REFERENCES md_import_batch (organization_id, id),
	CONSTRAINT md_import_batch_row_source_number_ck CHECK (source_row_number > 0),
	CONSTRAINT md_import_batch_row_status_ck
		CHECK (status IN ('pending', 'applying', 'applied', 'failed', 'skipped')),
	CONSTRAINT md_import_batch_row_operation_ck
		CHECK (intended_operation IS NULL OR intended_operation IN ('create', 'update', 'skip', 'reject')),
	CONSTRAINT md_import_batch_row_lease_ck CHECK (
		(lease_owner IS NULL AND lease_expires_at IS NULL)
		OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
	)
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS md_import_batch_row_org_source_uidx
	ON md_import_batch_row (organization_id, batch_id, source_row_number);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS md_import_batch_row_org_status_idx
	ON md_import_batch_row (organization_id, batch_id, status, source_row_number);
-- END 0029_master_data_import_recovery

-- Backfill exact historical hashes only after all missing DDL succeeds.

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'a081ca31df08121688db64be2c2867827367b661896f9f389ac82c247f9e0595', 1785147349935
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'a081ca31df08121688db64be2c2867827367b661896f9f389ac82c247f9e0595' OR created_at = 1785147349935
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '4a813f8ad1c40e4a59dbbf727b216844d9235ea56ab90e3fbf234c5a7279328d', 1785149513070
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '4a813f8ad1c40e4a59dbbf727b216844d9235ea56ab90e3fbf234c5a7279328d' OR created_at = 1785149513070
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '46f98b5b7cce48f2f052197aada443ebb0fa383cf2de87b857e8e665862b00fa', 1785149906662
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '46f98b5b7cce48f2f052197aada443ebb0fa383cf2de87b857e8e665862b00fa' OR created_at = 1785149906662
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'cc43dcaaaf19711fb8b0720c13214543c0d99da876b46769a026d1a3339291d6', 1785150770748
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'cc43dcaaaf19711fb8b0720c13214543c0d99da876b46769a026d1a3339291d6' OR created_at = 1785150770748
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'de1bed1f2298a0d2c4cd7a91fd2658560325b642930db79e30a1c64e3062bc45', 1785151245213
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'de1bed1f2298a0d2c4cd7a91fd2658560325b642930db79e30a1c64e3062bc45' OR created_at = 1785151245213
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '90436e8462af868a23c1b8450cc21d893477e8750c8dfefeccb77f859c14feb5', 1785151757192
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '90436e8462af868a23c1b8450cc21d893477e8750c8dfefeccb77f859c14feb5' OR created_at = 1785151757192
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'e8fc80ddab07db5c789597477e4b13456728ddfdd77233884504f879fa118660', 1785152705015
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'e8fc80ddab07db5c789597477e4b13456728ddfdd77233884504f879fa118660' OR created_at = 1785152705015
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '3bc7acc5ce4871533378127e69f5038f1489c365c3e7adf735c1cbd66c9749ed', 1785153300766
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '3bc7acc5ce4871533378127e69f5038f1489c365c3e7adf735c1cbd66c9749ed' OR created_at = 1785153300766
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'c95f533c208de40b67570050db62cbe787914f702605d884d0be7268618c57b9', 1785154388879
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'c95f533c208de40b67570050db62cbe787914f702605d884d0be7268618c57b9' OR created_at = 1785154388879
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '97c7204ad6b7b6c651b531eecafa4fe4ac74a0e3ecf0ac7ff93f910dfb1645d7', 1785155219561
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '97c7204ad6b7b6c651b531eecafa4fe4ac74a0e3ecf0ac7ff93f910dfb1645d7' OR created_at = 1785155219561
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'ed08c67340613a1ad15a947280af71a66221b329abe5761407bb2ed172bfeb27', 1785155850339
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'ed08c67340613a1ad15a947280af71a66221b329abe5761407bb2ed172bfeb27' OR created_at = 1785155850339
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '4a61a31c80e3226f4f757719e383493306d674607257dcb68e2bdd417ec63685', 1785156081736
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '4a61a31c80e3226f4f757719e383493306d674607257dcb68e2bdd417ec63685' OR created_at = 1785156081736
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '480300d12c73a7b511cb614004c993e3141cd664b960bdd6922d6774a87926c2', 1785156325986
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '480300d12c73a7b511cb614004c993e3141cd664b960bdd6922d6774a87926c2' OR created_at = 1785156325986
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '7a9cf40e0c4b7ab424a45c4276d9f3245962c3f4178c260f6bcf2be26220221b', 1785156608306
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '7a9cf40e0c4b7ab424a45c4276d9f3245962c3f4178c260f6bcf2be26220221b' OR created_at = 1785156608306
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'f7914be9c6db588ab14fc962dd1cd9a296ace64a014f063b5289f5f5b8a76f3a', 1785156994309
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'f7914be9c6db588ab14fc962dd1cd9a296ace64a014f063b5289f5f5b8a76f3a' OR created_at = 1785156994309
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '618656f02bd2b474a6a2d2d91e2dfa8ecc7d88a112b401466278fd99aa32adeb', 1785157557345
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '618656f02bd2b474a6a2d2d91e2dfa8ecc7d88a112b401466278fd99aa32adeb' OR created_at = 1785157557345
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'd8979493029686aa2b4e00697e7d2dc383716d057b19cdec6dc8c4699a69b193', 1785158379708
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'd8979493029686aa2b4e00697e7d2dc383716d057b19cdec6dc8c4699a69b193' OR created_at = 1785158379708
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '73d39e215df7172b16a5bfbb8ddb4c978301335c4adbcac27c706c9ea02b696a', 1785161671087
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '73d39e215df7172b16a5bfbb8ddb4c978301335c4adbcac27c706c9ea02b696a' OR created_at = 1785161671087
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'a4f0c47447bf427c86620a83c10f7108db82ea62985ae85a98bc5e6483f67f78', 1785280000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'a4f0c47447bf427c86620a83c10f7108db82ea62985ae85a98bc5e6483f67f78' OR created_at = 1785280000000
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '6da0ea858055b46be861287d20da0a973248ef71084c4f511f2cca7ebcd61940', 1785282000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '6da0ea858055b46be861287d20da0a973248ef71084c4f511f2cca7ebcd61940' OR created_at = 1785282000000
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'be4d7446ff32c4874f4aff4aca72b8971e200163a6efbf02e5d9606af3026cd9', 1785284000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = 'be4d7446ff32c4874f4aff4aca72b8971e200163a6efbf02e5d9606af3026cd9' OR created_at = 1785284000000
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '62764bb3271437f91e479babb0e273eabf985dd1458e0816aa781b1b7988d10c', 1785285000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '62764bb3271437f91e479babb0e273eabf985dd1458e0816aa781b1b7988d10c' OR created_at = 1785285000000
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '6443a861060fd8ff91dab6a97b3df6507f9095a8d05b08eac8adecb7e82c9cce', 1785286000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '6443a861060fd8ff91dab6a97b3df6507f9095a8d05b08eac8adecb7e82c9cce' OR created_at = 1785286000000
);--> statement-breakpoint

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '27fc672330deef991dacf9f35a0f548f764bf33af42cf137e180ec8c1eb053d2', 1785283000000
WHERE NOT EXISTS (
	SELECT 1 FROM drizzle.__drizzle_migrations
	WHERE hash = '27fc672330deef991dacf9f35a0f548f764bf33af42cf137e180ec8c1eb053d2' OR created_at = 1785283000000
);--> statement-breakpoint
