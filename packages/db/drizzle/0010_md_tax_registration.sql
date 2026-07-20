CREATE TABLE "md_tax_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"party_id" uuid NOT NULL,
	"jurisdiction_country_id" uuid NOT NULL,
	"registration_type" text NOT NULL,
	"registration_number" text NOT NULL,
	"normalized_registration_number" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by" text,
	"blocked_at" timestamp with time zone,
	"blocked_by" text,
	"retired_at" timestamp with time zone,
	"retired_by" text,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_jurisdiction_country_id_ref_country_id_fk" FOREIGN KEY ("jurisdiction_country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_id_idx" ON "md_tax_registration" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_status_idx" ON "md_tax_registration" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_party_idx" ON "md_tax_registration" USING btree ("organization_id","party_id");
--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_updated_at_idx" ON "md_tax_registration" USING btree ("organization_id","updated_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_tax_registration_live_identity_uidx" ON "md_tax_registration" USING btree ("organization_id","party_id","jurisdiction_country_id","registration_type","normalized_registration_number") WHERE "md_tax_registration"."retired_at" IS NULL AND "md_tax_registration"."deleted_at" IS NULL;
