CREATE TABLE "md_item_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by" text,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_template_attribute" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"value_kind" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_template_attribute_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"attribute_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"combination_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_variant_attribute_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"value_text" text,
	"option_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD CONSTRAINT "md_item_template_attribute_template_id_md_item_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."md_item_template"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD CONSTRAINT "md_item_template_attribute_option_attribute_id_md_item_template_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."md_item_template_attribute"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_template_id_md_item_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."md_item_template"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_variant_id_md_item_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."md_item_variant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_attribute_id_md_item_template_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."md_item_template_attribute"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_option_id_md_item_template_attribute_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."md_item_template_attribute_option"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "md_item_template_org_id_idx" ON "md_item_template" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "md_item_template_org_status_idx" ON "md_item_template" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "md_item_template_org_updated_at_idx" ON "md_item_template" USING btree ("organization_id","updated_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_org_normalized_code_live_uidx" ON "md_item_template" USING btree ("organization_id","normalized_code") WHERE "md_item_template"."retired_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "md_item_template_attribute_org_template_idx" ON "md_item_template_attribute" USING btree ("organization_id","template_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_attribute_org_template_code_uidx" ON "md_item_template_attribute" USING btree ("organization_id","template_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "md_item_template_attribute_option_org_attr_idx" ON "md_item_template_attribute_option" USING btree ("organization_id","attribute_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_attribute_option_org_attr_code_uidx" ON "md_item_template_attribute_option" USING btree ("organization_id","attribute_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "md_item_variant_org_template_idx" ON "md_item_variant" USING btree ("organization_id","template_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_org_item_uidx" ON "md_item_variant" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_org_template_combination_live_uidx" ON "md_item_variant" USING btree ("organization_id","template_id","combination_key") WHERE "md_item_variant"."retired_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "md_item_variant_attribute_value_org_variant_idx" ON "md_item_variant_attribute_value" USING btree ("organization_id","variant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_attribute_value_org_variant_attr_uidx" ON "md_item_variant_attribute_value" USING btree ("organization_id","variant_id","attribute_id");
