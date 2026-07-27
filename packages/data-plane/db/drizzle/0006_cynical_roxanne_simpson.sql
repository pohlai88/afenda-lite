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

