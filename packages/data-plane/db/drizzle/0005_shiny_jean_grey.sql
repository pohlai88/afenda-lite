CREATE TABLE "md_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"item_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"item_group_id" uuid NOT NULL,
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
CREATE TABLE "md_item_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
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
CREATE TABLE "md_party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"party_kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"legal_name" text,
	"trading_name" text,
	"registration_number" text,
	"registration_country_id" uuid,
	"preferred_language_id" uuid,
	"default_currency_id" uuid,
	"merged_into_id" uuid,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by" text,
	"blocked_at" timestamp with time zone,
	"blocked_by" text,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_warehouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"location_type" text NOT NULL,
	"parent_id" uuid,
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
CREATE TABLE "ref_country" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"alpha3" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_currency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"minor_units" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_time_zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iana_name" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_uom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"dimension_id" uuid NOT NULL,
	"to_base_numerator" numeric(24, 12) NOT NULL,
	"to_base_denominator" numeric(24, 12) NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref_uom_dimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_base_uom_id_ref_uom_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_item_group_id_md_item_group_id_fk" FOREIGN KEY ("item_group_id") REFERENCES "public"."md_item_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_registration_country_id_ref_country_id_fk" FOREIGN KEY ("registration_country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_preferred_language_id_ref_language_id_fk" FOREIGN KEY ("preferred_language_id") REFERENCES "public"."ref_language"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_default_currency_id_ref_currency_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."ref_currency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref_uom" ADD CONSTRAINT "ref_uom_dimension_id_ref_uom_dimension_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."ref_uom_dimension"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "md_item_org_id_idx" ON "md_item" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_item_org_status_idx" ON "md_item" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_item_org_group_idx" ON "md_item" USING btree ("organization_id","item_group_id");--> statement-breakpoint
CREATE INDEX "md_item_base_uom_idx" ON "md_item" USING btree ("base_uom_id");--> statement-breakpoint
CREATE INDEX "md_item_org_updated_at_idx" ON "md_item" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_org_normalized_code_live_uidx" ON "md_item" USING btree ("organization_id","normalized_code") WHERE "md_item"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_group_org_id_idx" ON "md_item_group" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_item_group_org_status_idx" ON "md_item_group" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_item_group_org_parent_idx" ON "md_item_group" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "md_item_group_org_updated_at_idx" ON "md_item_group" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_group_org_normalized_code_live_uidx" ON "md_item_group" USING btree ("organization_id","normalized_code") WHERE "md_item_group"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_party_org_id_idx" ON "md_party" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_party_org_status_idx" ON "md_party" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_party_org_updated_at_idx" ON "md_party" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_org_normalized_code_live_uidx" ON "md_party" USING btree ("organization_id","normalized_code") WHERE "md_party"."retired_at" IS NULL AND "md_party"."merged_into_id" IS NULL;--> statement-breakpoint
CREATE INDEX "md_warehouse_org_id_idx" ON "md_warehouse" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_status_idx" ON "md_warehouse" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_parent_idx" ON "md_warehouse" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_updated_at_idx" ON "md_warehouse" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_org_normalized_code_live_uidx" ON "md_warehouse" USING btree ("organization_id","normalized_code") WHERE "md_warehouse"."retired_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ref_country_code_uidx" ON "ref_country" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_currency_code_uidx" ON "ref_currency" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_language_code_uidx" ON "ref_language" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_time_zone_iana_name_uidx" ON "ref_time_zone" USING btree ("iana_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_uom_code_uidx" ON "ref_uom" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ref_uom_dimension_id_idx" ON "ref_uom" USING btree ("dimension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_uom_dimension_code_uidx" ON "ref_uom_dimension" USING btree ("code");--> statement-breakpoint
-- Controlled platform reference seed (Authority B — not a full ISO dump)
INSERT INTO "ref_uom_dimension" ("id", "code", "name") VALUES
	('a1000000-0000-4000-8000-000000000001', 'count', 'Count'),
	('a1000000-0000-4000-8000-000000000002', 'mass', 'Mass'),
	('a1000000-0000-4000-8000-000000000003', 'volume', 'Volume'),
	('a1000000-0000-4000-8000-000000000004', 'length', 'Length'),
	('a1000000-0000-4000-8000-000000000005', 'area', 'Area'),
	('a1000000-0000-4000-8000-000000000006', 'time', 'Time');--> statement-breakpoint
INSERT INTO "ref_uom" ("id", "code", "name", "symbol", "dimension_id", "to_base_numerator", "to_base_denominator", "is_base", "active") VALUES
	('b1000000-0000-4000-8000-000000000001', 'EA', 'Each', 'ea', 'a1000000-0000-4000-8000-000000000001', '1', '1', true, true),
	('b1000000-0000-4000-8000-000000000002', 'KG', 'Kilogram', 'kg', 'a1000000-0000-4000-8000-000000000002', '1', '1', true, true),
	('b1000000-0000-4000-8000-000000000003', 'G', 'Gram', 'g', 'a1000000-0000-4000-8000-000000000002', '1', '1000', false, true),
	('b1000000-0000-4000-8000-000000000004', 'L', 'Litre', 'L', 'a1000000-0000-4000-8000-000000000003', '1', '1', true, true),
	('b1000000-0000-4000-8000-000000000005', 'M', 'Metre', 'm', 'a1000000-0000-4000-8000-000000000004', '1', '1', true, true),
	('b1000000-0000-4000-8000-000000000006', 'M2', 'Square metre', 'm²', 'a1000000-0000-4000-8000-000000000005', '1', '1', true, true),
	('b1000000-0000-4000-8000-000000000007', 'S', 'Second', 's', 'a1000000-0000-4000-8000-000000000006', '1', '1', true, true);--> statement-breakpoint
INSERT INTO "ref_country" ("id", "code", "alpha3", "name", "active") VALUES
	('c1000000-0000-4000-8000-000000000001', 'MY', 'MYS', 'Malaysia', true),
	('c1000000-0000-4000-8000-000000000002', 'SG', 'SGP', 'Singapore', true),
	('c1000000-0000-4000-8000-000000000003', 'US', 'USA', 'United States of America', true);--> statement-breakpoint
INSERT INTO "ref_currency" ("id", "code", "name", "minor_units", "active") VALUES
	('d1000000-0000-4000-8000-000000000001', 'MYR', 'Malaysian Ringgit', 2, true),
	('d1000000-0000-4000-8000-000000000002', 'SGD', 'Singapore Dollar', 2, true),
	('d1000000-0000-4000-8000-000000000003', 'USD', 'US Dollar', 2, true);--> statement-breakpoint
INSERT INTO "ref_language" ("id", "code", "name", "active") VALUES
	('e1000000-0000-4000-8000-000000000001', 'en', 'English', true),
	('e1000000-0000-4000-8000-000000000002', 'ms', 'Malay', true);--> statement-breakpoint
INSERT INTO "ref_time_zone" ("id", "iana_name", "name", "active") VALUES
	('f1000000-0000-4000-8000-000000000001', 'Asia/Kuala_Lumpur', 'Malaysia Time', true),
	('f1000000-0000-4000-8000-000000000002', 'Asia/Singapore', 'Singapore Time', true),
	('f1000000-0000-4000-8000-000000000003', 'UTC', 'Coordinated Universal Time', true);
