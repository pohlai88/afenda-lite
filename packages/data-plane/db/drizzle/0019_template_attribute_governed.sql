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
