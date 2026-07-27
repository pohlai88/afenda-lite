CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "ca_legal_company"
	ADD CONSTRAINT "ca_legal_company_org_id_unique"
	UNIQUE ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "ca_company_jurisdiction_profile"
	ADD CONSTRAINT "ca_company_jurisdiction_profile_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_jurisdiction_profile"
	ADD CONSTRAINT "ca_company_jurisdiction_profile_supersedes_same_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id")
	REFERENCES "ca_company_jurisdiction_profile" (
		"organization_id",
		"legal_company_id",
		"id"
	)
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_jurisdiction_profile"
	ADD CONSTRAINT "ca_company_jurisdiction_profile_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("superseded_at" IS NULL);
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	ADD CONSTRAINT "ca_company_name_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	ADD CONSTRAINT "ca_company_name_supersedes_same_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id")
	REFERENCES "ca_company_name" (
		"organization_id",
		"legal_company_id",
		"id"
	)
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_legal_form_history"
	ADD CONSTRAINT "ca_company_legal_form_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id")
	REFERENCES "ca_legal_company" ("organization_id", "id")
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_legal_form_history"
	ADD CONSTRAINT "ca_company_legal_form_supersedes_same_company_fk"
	FOREIGN KEY ("organization_id", "legal_company_id", "supersedes_id")
	REFERENCES "ca_company_legal_form_history" (
		"organization_id",
		"legal_company_id",
		"id"
	)
	ON DELETE no action
	ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	ADD CONSTRAINT "ca_company_name_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		"name_type" WITH =,
		"language_code" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("status" = 'active');
--> statement-breakpoint
ALTER TABLE "ca_company_name"
	ADD CONSTRAINT "ca_company_name_duplicate_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		"name_type" WITH =,
		"language_code" WITH =,
		"normalized_name" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("status" = 'active');
--> statement-breakpoint
ALTER TABLE "ca_company_legal_form_history"
	ADD CONSTRAINT "ca_company_legal_form_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("status" = 'active');
--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_identifier_tenant_authority_open_uidx"
	ON "ca_company_identifier" (
		"organization_id",
		"identifier_type",
		"jurisdiction_code",
		"authority_code",
		"normalized_value"
	)
	WHERE "status" = 'active'
		AND "effective_to" IS NULL
		AND "uniqueness_scope" IN ('global_authority', 'tenant_authority');
--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_identifier_company_authority_open_uidx"
	ON "ca_company_identifier" (
		"organization_id",
		"legal_company_id",
		"identifier_type",
		"jurisdiction_code",
		"authority_code",
		"normalized_value"
	)
	WHERE "status" = 'active'
		AND "effective_to" IS NULL
		AND "uniqueness_scope" = 'company_authority';
--> statement-breakpoint
ALTER TABLE "ca_company_identifier"
	ADD CONSTRAINT "ca_company_identifier_tenant_authority_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"identifier_type" WITH =,
		"jurisdiction_code" WITH =,
		"authority_code" WITH =,
		"normalized_value" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE (
		"status" = 'active'
		AND "uniqueness_scope" IN ('global_authority', 'tenant_authority')
	);
--> statement-breakpoint
ALTER TABLE "ca_company_identifier"
	ADD CONSTRAINT "ca_company_identifier_company_authority_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		"identifier_type" WITH =,
		"jurisdiction_code" WITH =,
		"authority_code" WITH =,
		"normalized_value" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE (
		"status" = 'active'
		AND "uniqueness_scope" = 'company_authority'
	);
--> statement-breakpoint
ALTER TABLE "ca_company_financial_year"
	ADD CONSTRAINT "ca_company_financial_year_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("status" = 'active');
--> statement-breakpoint
ALTER TABLE "ca_company_activity"
	ADD CONSTRAINT "ca_company_activity_no_overlap_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"legal_company_id" WITH =,
		"activity_type" WITH =,
		"classification_system" WITH =,
		"activity_code" WITH =,
		"jurisdiction_code" WITH =,
		daterange("effective_from", COALESCE("effective_to", 'infinity'::date), '[)') WITH &&
	)
	WHERE ("status" = 'active');
