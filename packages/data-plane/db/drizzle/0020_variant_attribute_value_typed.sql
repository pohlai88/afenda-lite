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
