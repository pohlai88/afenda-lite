CREATE TABLE "ca_establishment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"legal_establishment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"reason" text,
	"source_document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_establishment_status_value_check" CHECK ("ca_establishment_status_history"."status" IN ('registered', 'active', 'suspended', 'closed')),
	CONSTRAINT "ca_establishment_status_effective_range_check" CHECK ("ca_establishment_status_history"."effective_to" IS NULL OR "ca_establishment_status_history"."effective_from" < "ca_establishment_status_history"."effective_to"),
	CONSTRAINT "ca_establishment_status_source_check" CHECK (char_length(btrim("ca_establishment_status_history"."source_document_id")) > 0),
	CONSTRAINT "ca_establishment_status_version_check" CHECK ("ca_establishment_status_history"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_legal_establishment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"establishment_type" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"registration_identifier" text NOT NULL,
	"normalized_registration_identifier" text NOT NULL,
	"display_name" text NOT NULL,
	"current_status" text DEFAULT 'registered' NOT NULL,
	"registered_from" date NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_legal_establishment_type_check" CHECK ("ca_legal_establishment"."establishment_type" IN ('branch', 'representative_office', 'foreign_registration', 'other')),
	CONSTRAINT "ca_legal_establishment_status_check" CHECK ("ca_legal_establishment"."current_status" IN ('registered', 'active', 'suspended', 'closed')),
	CONSTRAINT "ca_legal_establishment_jurisdiction_check" CHECK ("ca_legal_establishment"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_legal_establishment_identifier_check" CHECK (char_length(btrim("ca_legal_establishment"."registration_identifier")) > 0 AND "ca_legal_establishment"."normalized_registration_identifier" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_legal_establishment_display_name_check" CHECK (char_length(btrim("ca_legal_establishment"."display_name")) > 0),
	CONSTRAINT "ca_legal_establishment_version_check" CHECK ("ca_legal_establishment"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_premise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"legal_establishment_id" uuid,
	"premise_type" text NOT NULL,
	"display_name" text NOT NULL,
	"source_party_address_id" uuid NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"city" text NOT NULL,
	"region" text,
	"postal_code" text,
	"country_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"end_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_premise_type_check" CHECK ("ca_premise"."premise_type" IN ('office', 'warehouse', 'operational_site', 'other')),
	CONSTRAINT "ca_premise_status_check" CHECK ("ca_premise"."status" IN ('active', 'ended')),
	CONSTRAINT "ca_premise_snapshot_check" CHECK (char_length(btrim("ca_premise"."display_name")) > 0 AND char_length(btrim("ca_premise"."line_1")) > 0 AND char_length(btrim("ca_premise"."city")) > 0 AND "ca_premise"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_premise_effective_range_check" CHECK ("ca_premise"."effective_to" IS NULL OR "ca_premise"."effective_from" < "ca_premise"."effective_to"),
	CONSTRAINT "ca_premise_end_check" CHECK (("ca_premise"."status" = 'ended' AND "ca_premise"."effective_to" IS NOT NULL AND "ca_premise"."end_reason" IS NOT NULL) OR "ca_premise"."status" = 'active'),
	CONSTRAINT "ca_premise_version_check" CHECK ("ca_premise"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_registered_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"legal_establishment_id" uuid,
	"address_scope_key" text NOT NULL,
	"address_type" text NOT NULL,
	"source_party_address_id" uuid NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"city" text NOT NULL,
	"region" text,
	"postal_code" text,
	"country_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_registered_address_type_check" CHECK ("ca_registered_address"."address_type" IN ('registered_office', 'service_address', 'place_of_business')),
	CONSTRAINT "ca_registered_address_scope_check" CHECK ("ca_registered_address"."address_scope_key" = COALESCE("ca_registered_address"."legal_establishment_id"::text, "ca_registered_address"."legal_company_id"::text)),
	CONSTRAINT "ca_registered_address_snapshot_check" CHECK (char_length(btrim("ca_registered_address"."line_1")) > 0 AND char_length(btrim("ca_registered_address"."city")) > 0 AND "ca_registered_address"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_registered_address_effective_range_check" CHECK ("ca_registered_address"."effective_to" IS NULL OR "ca_registered_address"."effective_from" < "ca_registered_address"."effective_to"),
	CONSTRAINT "ca_registered_address_version_check" CHECK ("ca_registered_address"."version" > 0)
);
--> statement-breakpoint
CREATE INDEX "ca_establishment_status_as_of_idx" ON "ca_establishment_status_history" USING btree ("organization_id","legal_establishment_id","effective_from","effective_to","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_legal_establishment_natural_key_uidx" ON "ca_legal_establishment" USING btree ("organization_id","jurisdiction_code","establishment_type","normalized_registration_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_legal_establishment_org_company_id_uidx" ON "ca_legal_establishment" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_legal_establishment_company_idx" ON "ca_legal_establishment" USING btree ("organization_id","legal_company_id","current_status");--> statement-breakpoint
CREATE INDEX "ca_premise_as_of_idx" ON "ca_premise" USING btree ("organization_id","legal_company_id","legal_establishment_id","premise_type","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_registered_address_as_of_idx" ON "ca_registered_address" USING btree ("organization_id","address_scope_key","address_type","effective_from","effective_to","recorded_at");
--> statement-breakpoint
ALTER TABLE "ca_legal_establishment"
	ADD CONSTRAINT "ca_legal_establishment_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_establishment_status_history"
	ADD CONSTRAINT "ca_establishment_status_establishment_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "legal_establishment_id")
	REFERENCES "ca_legal_establishment" ("organization_id", "legal_company_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_registered_address"
	ADD CONSTRAINT "ca_registered_address_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_registered_address"
	ADD CONSTRAINT "ca_registered_address_establishment_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "legal_establishment_id")
	REFERENCES "ca_legal_establishment" ("organization_id", "legal_company_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_premise"
	ADD CONSTRAINT "ca_premise_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_premise"
	ADD CONSTRAINT "ca_premise_establishment_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "legal_establishment_id")
	REFERENCES "ca_legal_establishment" ("organization_id", "legal_company_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_establishment_status_history"
	ADD CONSTRAINT "ca_establishment_status_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_establishment_id" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	);
--> statement-breakpoint
ALTER TABLE "ca_registered_address"
	ADD CONSTRAINT "ca_registered_address_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"address_scope_key" WITH =,
		"address_type" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	);
