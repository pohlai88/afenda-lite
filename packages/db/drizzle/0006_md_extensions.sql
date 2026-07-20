CREATE TABLE "md_party_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"party_id" uuid NOT NULL,
	"role_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
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
CREATE TABLE "md_party_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"party_id" uuid NOT NULL,
	"address_type" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"region" text,
	"postal_code" text,
	"country_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_party_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"party_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"value" text NOT NULL,
	"purpose" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_party_external_id" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"party_id" uuid NOT NULL,
	"system" text NOT NULL,
	"namespace" text DEFAULT '' NOT NULL,
	"external_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_party_relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"from_party_id" uuid NOT NULL,
	"to_party_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_uom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"uom_id" uuid NOT NULL,
	"to_base_numerator" numeric(24, 12) NOT NULL,
	"to_base_denominator" numeric(24, 12) NOT NULL,
	"usage" text NOT NULL,
	"barcode" text,
	"rounding_rule" text,
	"min_quantity" numeric(24, 12),
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_barcode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"barcode" text NOT NULL,
	"barcode_type" text DEFAULT 'generic' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_external_id" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"system" text NOT NULL,
	"namespace" text DEFAULT '' NOT NULL,
	"external_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_item_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"alias_code" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_warehouse_external_id" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"system" text NOT NULL,
	"namespace" text DEFAULT '' NOT NULL,
	"external_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_country_id_ref_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_from_party_id_md_party_id_fk" FOREIGN KEY ("from_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_to_party_id_md_party_id_fk" FOREIGN KEY ("to_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_uom_id_ref_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD CONSTRAINT "md_warehouse_external_id_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "md_party_role_org_party_idx" ON "md_party_role" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_role_org_status_idx" ON "md_party_role" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_role_org_party_code_live_uidx" ON "md_party_role" USING btree ("organization_id","party_id","role_code") WHERE "retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_party_address_org_party_idx" ON "md_party_address" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_address_org_country_idx" ON "md_party_address" USING btree ("organization_id","country_id");--> statement-breakpoint
CREATE INDEX "md_party_contact_org_party_idx" ON "md_party_contact" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_external_id_org_party_idx" ON "md_party_external_id" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_org_sys_ns_ext_uidx" ON "md_party_external_id" USING btree ("organization_id","system","namespace","external_id");--> statement-breakpoint
CREATE INDEX "md_party_relationship_org_from_idx" ON "md_party_relationship" USING btree ("organization_id","from_party_id");--> statement-breakpoint
CREATE INDEX "md_party_relationship_org_to_idx" ON "md_party_relationship" USING btree ("organization_id","to_party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_relationship_org_pair_type_uidx" ON "md_party_relationship" USING btree ("organization_id","from_party_id","to_party_id","relationship_type");--> statement-breakpoint
CREATE INDEX "md_item_uom_org_item_idx" ON "md_item_uom" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "md_item_uom_uom_idx" ON "md_item_uom" USING btree ("uom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_uom_org_item_uom_usage_uidx" ON "md_item_uom" USING btree ("organization_id","item_id","uom_id","usage");--> statement-breakpoint
CREATE INDEX "md_item_barcode_org_item_idx" ON "md_item_barcode" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_org_barcode_uidx" ON "md_item_barcode" USING btree ("organization_id","barcode");--> statement-breakpoint
CREATE INDEX "md_item_external_id_org_item_idx" ON "md_item_external_id" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_external_id_org_sys_ns_ext_uidx" ON "md_item_external_id" USING btree ("organization_id","system","namespace","external_id");--> statement-breakpoint
CREATE INDEX "md_item_alias_org_item_idx" ON "md_item_alias" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_alias_org_normalized_live_uidx" ON "md_item_alias" USING btree ("organization_id","normalized_alias") WHERE "retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_warehouse_external_id_org_wh_idx" ON "md_warehouse_external_id" USING btree ("organization_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_external_id_org_sys_ns_ext_uidx" ON "md_warehouse_external_id" USING btree ("organization_id","system","namespace","external_id");
