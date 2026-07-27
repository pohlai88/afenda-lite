CREATE TABLE "account_role_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"account_role" text NOT NULL,
	"ledger_account_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"soft_closed" boolean DEFAULT false NOT NULL,
	"soft_closed_at" timestamp with time zone,
	"soft_closed_by" text,
	"reopen_reason" text,
	"reopened_at" timestamp with time zone,
	"reopened_by" text,
	"close_reason" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_posting_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"source_module" text NOT NULL,
	"source_aggregate_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"source_event_version" integer NOT NULL,
	"posting_rule_code" text,
	"reason_code" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"payload" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"journal_type" text DEFAULT 'manual' NOT NULL,
	"period_id" uuid,
	"currency_code" text NOT NULL,
	"description" text,
	"reversal_of_journal_id" uuid,
	"reversed_by_journal_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"journal_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"account_code" text NOT NULL,
	"account_name" text,
	"ledger_account_id" uuid,
	"debit_amount" text DEFAULT '0' NOT NULL,
	"credit_amount" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"chart_of_account_id" uuid NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"normal_balance" text NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_posting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"journal_id" uuid NOT NULL,
	"journal_line_id" uuid NOT NULL,
	"account_code" text NOT NULL,
	"ledger_account_id" uuid,
	"debit_amount" text NOT NULL,
	"credit_amount" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posting_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"event_type" text NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posting_profile_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"posting_profile_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"side" text NOT NULL,
	"account_role" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_posting_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"source_module" text NOT NULL,
	"source_aggregate_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"source_event_version" integer NOT NULL,
	"posting_rule_id" uuid NOT NULL,
	"posting_rule_version" integer NOT NULL,
	"journal_id" uuid NOT NULL,
	"causation_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ca_company_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"classification_system" text DEFAULT 'registered_activity' NOT NULL,
	"activity_code" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"regulator_code" text,
	"description" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_activity_classification_check" CHECK ("ca_company_activity"."activity_type" IN ('registered_object', 'regulated', 'operational')),
	CONSTRAINT "ca_company_activity_classification_system_check" CHECK (char_length(btrim("ca_company_activity"."classification_system")) > 0),
	CONSTRAINT "ca_company_activity_regulator_check" CHECK ("ca_company_activity"."activity_type" <> 'regulated' OR "ca_company_activity"."regulator_code" IS NOT NULL),
	CONSTRAINT "ca_company_activity_jurisdiction_check" CHECK ("ca_company_activity"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_activity_code_check" CHECK ("ca_company_activity"."activity_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'),
	CONSTRAINT "ca_company_activity_description_check" CHECK (char_length(btrim("ca_company_activity"."description")) > 0),
	CONSTRAINT "ca_company_activity_effective_range_check" CHECK ("ca_company_activity"."effective_to" IS NULL OR "ca_company_activity"."effective_from" < "ca_company_activity"."effective_to"),
	CONSTRAINT "ca_company_activity_recorded_range_check" CHECK ("ca_company_activity"."recorded_to" IS NULL OR "ca_company_activity"."recorded_from" < "ca_company_activity"."recorded_to"),
	CONSTRAINT "ca_company_activity_status_check" CHECK ("ca_company_activity"."status" IN ('active', 'ended')),
	CONSTRAINT "ca_company_activity_version_check" CHECK ("ca_company_activity"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_company_financial_year" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"year_end_month" integer NOT NULL,
	"year_end_day" integer NOT NULL,
	"calendar_type" text DEFAULT 'gregorian' NOT NULL,
	"functional_currency_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_financial_year_start_check" CHECK ("ca_company_financial_year"."year_end_month" BETWEEN 1 AND 12 AND "ca_company_financial_year"."year_end_day" BETWEEN 1 AND 31),
	CONSTRAINT "ca_company_financial_year_calendar_check" CHECK ("ca_company_financial_year"."calendar_type" IN ('gregorian')),
	CONSTRAINT "ca_company_financial_year_currency_check" CHECK ("ca_company_financial_year"."functional_currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ca_company_financial_year_effective_range_check" CHECK ("ca_company_financial_year"."effective_to" IS NULL OR "ca_company_financial_year"."effective_from" < "ca_company_financial_year"."effective_to"),
	CONSTRAINT "ca_company_financial_year_recorded_range_check" CHECK ("ca_company_financial_year"."recorded_to" IS NULL OR "ca_company_financial_year"."recorded_from" < "ca_company_financial_year"."recorded_to"),
	CONSTRAINT "ca_company_financial_year_status_check" CHECK ("ca_company_financial_year"."status" IN ('active')),
	CONSTRAINT "ca_company_financial_year_version_check" CHECK ("ca_company_financial_year"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_company_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"authority_code" text NOT NULL,
	"display_value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"uniqueness_scope" text DEFAULT 'tenant_authority' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text NOT NULL,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_identifier_id" uuid,
	"retired_at" timestamp with time zone,
	"retirement_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_identifier_type_check" CHECK ("ca_company_identifier"."identifier_type" IN ('company_registration', 'registry_number', 'business_registration', 'foreign_registration', 'legal_entity_identifier', 'statistical_identifier', 'industry_identifier', 'other_non_tax_identifier')),
	CONSTRAINT "ca_company_identifier_not_tax_check" CHECK ("ca_company_identifier"."identifier_type" !~* '(tax|vat|gst|sst|tin)'),
	CONSTRAINT "ca_company_identifier_jurisdiction_check" CHECK ("ca_company_identifier"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_identifier_value_check" CHECK (char_length(btrim("ca_company_identifier"."display_value")) > 0 AND char_length(btrim("ca_company_identifier"."normalized_value")) > 0),
	CONSTRAINT "ca_company_identifier_uniqueness_scope_check" CHECK ("ca_company_identifier"."uniqueness_scope" IN ('global_authority', 'tenant_authority', 'company_authority')),
	CONSTRAINT "ca_company_identifier_effective_range_check" CHECK ("ca_company_identifier"."effective_to" IS NULL OR "ca_company_identifier"."effective_from" < "ca_company_identifier"."effective_to"),
	CONSTRAINT "ca_company_identifier_recorded_range_check" CHECK ("ca_company_identifier"."recorded_to" IS NULL OR "ca_company_identifier"."recorded_from" < "ca_company_identifier"."recorded_to"),
	CONSTRAINT "ca_company_identifier_status_check" CHECK ("ca_company_identifier"."status" IN ('active', 'superseded', 'retired')),
	CONSTRAINT "ca_company_identifier_supersedes_self_check" CHECK ("ca_company_identifier"."supersedes_id" IS NULL OR "ca_company_identifier"."supersedes_id" <> "ca_company_identifier"."id"),
	CONSTRAINT "ca_company_identifier_version_check" CHECK ("ca_company_identifier"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_company_jurisdiction_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"jurisdiction_country_code" text NOT NULL,
	"entity_type" text NOT NULL,
	"regulator_code" text,
	"compliance_profile_code" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_reference" text NOT NULL,
	"source_document_id" text,
	"correction_reason" text,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_profile_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_jurisdiction_profile_country_check" CHECK ("ca_company_jurisdiction_profile"."jurisdiction_country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_jurisdiction_profile_entity_type_check" CHECK ("ca_company_jurisdiction_profile"."entity_type" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'),
	CONSTRAINT "ca_company_jurisdiction_profile_regulator_code_check" CHECK ("ca_company_jurisdiction_profile"."regulator_code" IS NULL OR "ca_company_jurisdiction_profile"."regulator_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_company_jurisdiction_profile_compliance_profile_code_check" CHECK ("ca_company_jurisdiction_profile"."compliance_profile_code" IS NULL OR "ca_company_jurisdiction_profile"."compliance_profile_code" ~ '^[A-Z0-9][A-Z0-9._-]*$'),
	CONSTRAINT "ca_company_jurisdiction_profile_source_check" CHECK (char_length(btrim("ca_company_jurisdiction_profile"."source_reference")) > 0),
	CONSTRAINT "ca_company_jurisdiction_profile_source_document_check" CHECK ("ca_company_jurisdiction_profile"."source_document_id" IS NULL OR char_length(btrim("ca_company_jurisdiction_profile"."source_document_id")) > 0),
	CONSTRAINT "ca_company_jurisdiction_profile_correction_reason_check" CHECK ("ca_company_jurisdiction_profile"."correction_reason" IS NULL OR char_length(btrim("ca_company_jurisdiction_profile"."correction_reason")) > 0),
	CONSTRAINT "ca_company_jurisdiction_profile_effective_range_check" CHECK ("ca_company_jurisdiction_profile"."effective_to" IS NULL OR "ca_company_jurisdiction_profile"."effective_from" < "ca_company_jurisdiction_profile"."effective_to"),
	CONSTRAINT "ca_company_jurisdiction_profile_recorded_range_check" CHECK ("ca_company_jurisdiction_profile"."recorded_to" IS NULL OR "ca_company_jurisdiction_profile"."recorded_from" < "ca_company_jurisdiction_profile"."recorded_to"),
	CONSTRAINT "ca_company_jurisdiction_profile_supersedes_self_check" CHECK ("ca_company_jurisdiction_profile"."supersedes_id" IS NULL OR "ca_company_jurisdiction_profile"."supersedes_id" <> "ca_company_jurisdiction_profile"."id"),
	CONSTRAINT "ca_company_jurisdiction_profile_supersession_check" CHECK (("ca_company_jurisdiction_profile"."superseded_at" IS NULL AND "ca_company_jurisdiction_profile"."superseded_by_profile_id" IS NULL) OR ("ca_company_jurisdiction_profile"."superseded_at" IS NOT NULL AND "ca_company_jurisdiction_profile"."superseded_by_profile_id" IS NOT NULL)),
	CONSTRAINT "ca_company_jurisdiction_profile_version_check" CHECK ("ca_company_jurisdiction_profile"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_company_legal_form_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"legal_form_code" text NOT NULL,
	"entity_type_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_legal_form_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_legal_form_jurisdiction_check" CHECK ("ca_company_legal_form_history"."jurisdiction_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_company_legal_form_code_check" CHECK ("ca_company_legal_form_history"."legal_form_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$' AND "ca_company_legal_form_history"."entity_type_code" ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'),
	CONSTRAINT "ca_company_legal_form_effective_range_check" CHECK ("ca_company_legal_form_history"."effective_to" IS NULL OR "ca_company_legal_form_history"."effective_from" < "ca_company_legal_form_history"."effective_to"),
	CONSTRAINT "ca_company_legal_form_recorded_range_check" CHECK ("ca_company_legal_form_history"."recorded_to" IS NULL OR "ca_company_legal_form_history"."recorded_from" < "ca_company_legal_form_history"."recorded_to"),
	CONSTRAINT "ca_company_legal_form_status_check" CHECK ("ca_company_legal_form_history"."status" IN ('active', 'superseded')),
	CONSTRAINT "ca_company_legal_form_supersedes_self_check" CHECK ("ca_company_legal_form_history"."supersedes_id" IS NULL OR "ca_company_legal_form_history"."supersedes_id" <> "ca_company_legal_form_history"."id"),
	CONSTRAINT "ca_company_legal_form_supersession_check" CHECK (("ca_company_legal_form_history"."status" = 'superseded' AND "ca_company_legal_form_history"."superseded_at" IS NOT NULL AND "ca_company_legal_form_history"."superseded_by_legal_form_id" IS NOT NULL) OR ("ca_company_legal_form_history"."status" <> 'superseded')),
	CONSTRAINT "ca_company_legal_form_version_check" CHECK ("ca_company_legal_form_history"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_company_name" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"name_type" text NOT NULL,
	"language_code" text NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_from" timestamp with time zone NOT NULL,
	"recorded_to" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"source_document_id" text,
	"correction_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"superseded_by_name_id" uuid,
	"retired_at" timestamp with time zone,
	"retirement_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_company_name_type_check" CHECK ("ca_company_name"."name_type" IN ('legal', 'former', 'translated', 'trading')),
	CONSTRAINT "ca_company_name_language_check" CHECK ("ca_company_name"."language_code" ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
	CONSTRAINT "ca_company_name_display_check" CHECK (char_length(btrim("ca_company_name"."display_name")) > 0 AND char_length(btrim("ca_company_name"."normalized_name")) > 0),
	CONSTRAINT "ca_company_name_effective_range_check" CHECK ("ca_company_name"."effective_to" IS NULL OR "ca_company_name"."effective_from" < "ca_company_name"."effective_to"),
	CONSTRAINT "ca_company_name_recorded_range_check" CHECK ("ca_company_name"."recorded_to" IS NULL OR "ca_company_name"."recorded_from" < "ca_company_name"."recorded_to"),
	CONSTRAINT "ca_company_name_status_check" CHECK ("ca_company_name"."status" IN ('active', 'superseded', 'retired')),
	CONSTRAINT "ca_company_name_supersedes_self_check" CHECK ("ca_company_name"."supersedes_id" IS NULL OR "ca_company_name"."supersedes_id" <> "ca_company_name"."id"),
	CONSTRAINT "ca_company_name_supersession_check" CHECK (("ca_company_name"."status" = 'superseded' AND "ca_company_name"."superseded_at" IS NOT NULL AND "ca_company_name"."superseded_by_name_id" IS NOT NULL) OR ("ca_company_name"."status" <> 'superseded')),
	CONSTRAINT "ca_company_name_retirement_check" CHECK (("ca_company_name"."status" = 'retired' AND "ca_company_name"."retired_at" IS NOT NULL AND "ca_company_name"."retirement_reason" IS NOT NULL) OR ("ca_company_name"."status" <> 'retired')),
	CONSTRAINT "ca_company_name_version_check" CHECK ("ca_company_name"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_legal_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"company_code" text NOT NULL,
	"normalized_company_code" text NOT NULL,
	"display_name" text NOT NULL,
	"master_data_party_id" text NOT NULL,
	"home_jurisdiction_country_code" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_legal_company_state_check" CHECK ("ca_legal_company"."state" IN ('draft')),
	CONSTRAINT "ca_legal_company_code_check" CHECK (char_length(btrim("ca_legal_company"."company_code")) > 0 AND char_length(btrim("ca_legal_company"."normalized_company_code")) > 0),
	CONSTRAINT "ca_legal_company_country_check" CHECK ("ca_legal_company"."home_jurisdiction_country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "ca_legal_company_version_check" CHECK ("ca_legal_company"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ca_mutation_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"command_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"reservation_token" text NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"record_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_mutation_receipt_status_check" CHECK ("ca_mutation_receipt"."status" IN ('in_progress', 'completed', 'released')),
	CONSTRAINT "ca_mutation_receipt_scope_check" CHECK (char_length(btrim("ca_mutation_receipt"."organization_id")) > 0 AND char_length(btrim("ca_mutation_receipt"."command_id")) > 0 AND char_length(btrim("ca_mutation_receipt"."idempotency_key")) > 0),
	CONSTRAINT "ca_mutation_receipt_fingerprint_check" CHECK ("ca_mutation_receipt"."fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "ca_mutation_receipt_completion_check" CHECK (("ca_mutation_receipt"."status" = 'completed' AND "ca_mutation_receipt"."completed_at" IS NOT NULL AND "ca_mutation_receipt"."result" IS NOT NULL) OR ("ca_mutation_receipt"."status" <> 'completed' AND "ca_mutation_receipt"."completed_at" IS NULL AND "ca_mutation_receipt"."result" IS NULL)),
	CONSTRAINT "ca_mutation_receipt_reservation_check" CHECK (char_length("ca_mutation_receipt"."reservation_token") > 0),
	CONSTRAINT "ca_mutation_receipt_record_version_check" CHECK ("ca_mutation_receipt"."record_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sales_order_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"ship_to_party_id" uuid,
	"ship_to_party_code" text,
	"ship_to_party_name" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"delivered_at" timestamp with time zone,
	"delivered_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"create_idempotency_key" text,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"close_idempotency_key" text,
	"pack_idempotency_key" text,
	"pick_start_idempotency_key" text,
	"pod_idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity_ordered" text,
	"quantity_to_deliver" text NOT NULL,
	"sales_order_line_id" uuid,
	"line_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"package_code" text,
	"notes" text,
	"packed_at" timestamp with time zone NOT NULL,
	"packed_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_pick" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"delivery_line_id" uuid,
	"quantity_picked" text NOT NULL,
	"reservation_id" uuid,
	"pick_idempotency_key" text,
	"picked_at" timestamp with time zone NOT NULL,
	"picked_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_of_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"received_by_name" text NOT NULL,
	"outcome" text DEFAULT 'delivered' NOT NULL,
	"proof_type" text,
	"evidence_ref" text,
	"carrier_ref" text,
	"notes" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_allowance_entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"sequence" integer,
	"event_version_before" integer,
	"event_version_after" integer,
	"previous_occurred_at" timestamp with time zone NOT NULL,
	"new_occurred_at" timestamp with time zone NOT NULL,
	"previous_notes" text,
	"new_notes" text,
	"adjustment_reason" text NOT NULL,
	"evidence_reference" text,
	"actor_user_id" text NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_break_waiver_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"authority_assignment_id" uuid NOT NULL,
	"authority" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"evidence_reference" text NOT NULL,
	"automatic_break_minutes" integer NOT NULL,
	"recorded_break_minutes" integer NOT NULL,
	"session_version" integer NOT NULL,
	"correlation_id" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_break_waiver_decision_authority_check" CHECK ("hr_attendance_break_waiver_decision"."authority" IN ('line_manager', 'department', 'hr', 'payroll')),
	CONSTRAINT "hr_attendance_break_waiver_decision_minutes_check" CHECK ("hr_attendance_break_waiver_decision"."automatic_break_minutes" > 0 AND "hr_attendance_break_waiver_decision"."recorded_break_minutes" >= 0 AND "hr_attendance_break_waiver_decision"."recorded_break_minutes" < "hr_attendance_break_waiver_decision"."automatic_break_minutes"),
	CONSTRAINT "hr_attendance_break_waiver_decision_version_check" CHECK ("hr_attendance_break_waiver_decision"."session_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_assignment_id" uuid,
	"event_type" text NOT NULL,
	"captured_occurred_at" timestamp with time zone,
	"occurred_at" timestamp with time zone NOT NULL,
	"source_sequence" integer NOT NULL,
	"source_timezone" text NOT NULL,
	"local_work_date" date NOT NULL,
	"source" text NOT NULL,
	"source_reference" text,
	"device_metadata" jsonb,
	"location_key" text,
	"captured_notes" text,
	"notes" text,
	"payload_checksum" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_event_type_check" CHECK ("hr_attendance_event"."event_type" IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'manual_adjustment')),
	CONSTRAINT "hr_attendance_event_source_check" CHECK ("hr_attendance_event"."source" IN ('self', 'supervisor', 'import', 'system', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"session_id" uuid,
	"event_id" uuid,
	"shift_assignment_id" uuid,
	"exception_type" text NOT NULL,
	"severity" text NOT NULL,
	"detected_facts" jsonb,
	"review_status" text NOT NULL,
	"resolution" text,
	"reviewer_user_id" text,
	"evidence_reference" text,
	"remarks" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_exception_type_check" CHECK ("hr_attendance_exception"."exception_type" IN ('late_arrival', 'early_departure', 'absence', 'missing_clock_in', 'missing_clock_out', 'unplanned_attendance', 'overlapping_attendance', 'excessive_break', 'insufficient_rest', 'schedule_mismatch', 'location_mismatch', 'overtime_candidate')),
	CONSTRAINT "hr_attendance_exception_severity_check" CHECK ("hr_attendance_exception"."severity" IN ('info', 'warning', 'critical')),
	CONSTRAINT "hr_attendance_exception_status_check" CHECK ("hr_attendance_exception"."review_status" IN ('open', 'in_review', 'excused', 'rejected', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"source_key" text NOT NULL,
	"status" text NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"result_snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "hr_attendance_import_batch_status_check" CHECK ("hr_attendance_import_batch"."status" IN ('completed', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_import_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"import_batch_id" uuid NOT NULL,
	"row_index" integer NOT NULL,
	"source_reference" text,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"payload_checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_attendance_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_assignment_id" uuid,
	"local_work_date" date NOT NULL,
	"timezone" text NOT NULL,
	"first_clock_in_at" timestamp with time zone,
	"final_clock_out_at" timestamp with time zone,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"gross_minutes" integer DEFAULT 0 NOT NULL,
	"resolution_status" text NOT NULL,
	"requires_review" boolean DEFAULT false NOT NULL,
	"provenance" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_attendance_session_status_check" CHECK ("hr_attendance_session"."resolution_status" IN ('incomplete', 'resolved', 'needs_review', 'voided')),
	CONSTRAINT "hr_attendance_session_minutes_check" CHECK ("hr_attendance_session"."break_minutes" >= 0 AND "hr_attendance_session"."worked_minutes" >= 0 AND "hr_attendance_session"."gross_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hr_benefit_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"min_tenure_days" integer,
	"allowed_employment_statuses" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_benefit_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text NOT NULL,
	"employee_contribution_amount" text,
	"employer_contribution_amount" text,
	"contribution_currency_code" text,
	"contribution_frequency" text,
	"waiver_reason" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_benefit_enrollment_effective_range_ck" CHECK ("hr_benefit_enrollment"."effective_to" IS NULL OR "hr_benefit_enrollment"."effective_from" <= "hr_benefit_enrollment"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "hr_benefit_enrollment_dependent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"dependent_name" text NOT NULL,
	"relationship" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_benefit_enrollment_dependent_effective_range_ck" CHECK ("hr_benefit_enrollment_dependent"."effective_to" IS NULL OR "hr_benefit_enrollment_dependent"."effective_from" <= "hr_benefit_enrollment_dependent"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "hr_benefit_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"eligibility_note" text,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_bonus_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"phone" text,
	"consent_policy_version" text,
	"consent_captured_at" timestamp with time zone,
	"consent_source" text,
	"retention_until" date,
	"consent_withdrawn_at" timestamp with time zone,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_candidate_consent_source_check" CHECK ("hr_candidate"."consent_source" IS NULL OR "hr_candidate"."consent_source" IN ('self_service', 'recruiter_recorded', 'import'))
);
--> statement-breakpoint
CREATE TABLE "hr_candidate_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_candidate_application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"change_kind" text NOT NULL,
	"reason" text,
	"reason_code" text,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_candidate_application_status_history_change_kind_check" CHECK ("hr_candidate_application_status_history"."change_kind" IN ('create', 'lifecycle')),
	CONSTRAINT "hr_candidate_application_status_history_to_status_check" CHECK ("hr_candidate_application_status_history"."to_status" IN ('submitted', 'in_review', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "hr_career_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"owner_user_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_career_plan_status_check" CHECK ("hr_career_plan"."status" IN ('draft', 'acknowledged', 'active', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "hr_career_plan_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"career_plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_on" date,
	"status" text NOT NULL,
	"learning_assignment_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_career_plan_action_status_check" CHECK ("hr_career_plan_action"."status" IN ('open', 'done', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hr_clearance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"cleared_on" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_compensation_grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_compensation_grade_progression_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"from_grade_id" uuid NOT NULL,
	"to_grade_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"min_months_in_grade" integer,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_compensation_grade_progression_rule_effective_range_ck" CHECK ("hr_compensation_grade_progression_rule"."effective_to" IS NULL OR "hr_compensation_grade_progression_rule"."effective_from" <= "hr_compensation_grade_progression_rule"."effective_to"),
	CONSTRAINT "hr_compensation_grade_progression_rule_from_to_ck" CHECK ("hr_compensation_grade_progression_rule"."from_grade_id" <> "hr_compensation_grade_progression_rule"."to_grade_id")
);
--> statement-breakpoint
CREATE TABLE "hr_compensation_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"status" text NOT NULL,
	"proposed_base_amount" text,
	"proposed_currency_code" text,
	"proposed_grade_id" uuid,
	"proposed_salary_band_id" uuid,
	"confidential_note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_compensation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"proposed_base_amount" text,
	"proposed_currency_code" text,
	"proposed_grade_id" uuid,
	"proposed_salary_band_id" uuid,
	"recommendation_note" text,
	"effective_from" date,
	"finalized_at" timestamp with time zone,
	"applied_compensation_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_compensation_review_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text NOT NULL,
	"budget_total_amount" text NOT NULL,
	"budget_currency_code" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_compensation_review_cycle_status_check" CHECK ("hr_compensation_review_cycle"."status" IN ('draft', 'open', 'closed', 'cancelled')),
	CONSTRAINT "hr_compensation_review_cycle_period_range_check" CHECK ("hr_compensation_review_cycle"."period_end" >= "hr_compensation_review_cycle"."period_start")
);
--> statement-breakpoint
CREATE TABLE "hr_competency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"scale_code" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_competency_status_check" CHECK ("hr_competency"."status" IN ('active', 'retired')),
	CONSTRAINT "hr_competency_scale_code_check" CHECK ("hr_competency"."scale_code" IN ('five_point', 'behavioral_anchor'))
);
--> statement-breakpoint
CREATE TABLE "hr_competency_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"assessor_user_id" text NOT NULL,
	"evidence_source" text NOT NULL,
	"scale_code" text NOT NULL,
	"level" integer NOT NULL,
	"effective_on" date NOT NULL,
	"expires_on" date,
	"status" text NOT NULL,
	"supersedes_assessment_id" uuid,
	"superseded_by_assessment_id" uuid,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_competency_assessment_status_check" CHECK ("hr_competency_assessment"."status" IN ('current', 'superseded', 'expired')),
	CONSTRAINT "hr_competency_assessment_scale_code_check" CHECK ("hr_competency_assessment"."scale_code" IN ('five_point', 'behavioral_anchor')),
	CONSTRAINT "hr_competency_assessment_level_check" CHECK ("hr_competency_assessment"."level" >= 1 AND "hr_competency_assessment"."level" <= 5),
	CONSTRAINT "hr_competency_assessment_expires_after_effective_ck" CHECK ("hr_competency_assessment"."expires_on" IS NULL OR "hr_competency_assessment"."expires_on" > "hr_competency_assessment"."effective_on")
);
--> statement-breakpoint
CREATE TABLE "hr_department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"parent_department_id" uuid,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_department_org_id_uidx" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "hr_department_structure_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parent_department_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_structure_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_department_structure_version_lineage_status_check" CHECK ("hr_department_structure_version"."lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_department_structure_version_date_range_check" CHECK ("hr_department_structure_version"."effective_to" IS NULL OR "hr_department_structure_version"."effective_to" >= "hr_department_structure_version"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_development_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_document_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"document_type" text NOT NULL,
	"issuing_jurisdiction" text,
	"applies_to_note" text,
	"applicability_json" jsonb DEFAULT '{"kind":"all_employees"}'::jsonb NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_document_requirement_status_check" CHECK ("hr_document_requirement"."status" IN ('draft', 'published', 'retired')),
	CONSTRAINT "hr_document_requirement_applicability_shape_check" CHECK (jsonb_typeof("hr_document_requirement"."applicability_json") = 'object' AND ("hr_document_requirement"."applicability_json"->>'kind' = 'all_employees' OR ("hr_document_requirement"."applicability_json"->>'kind' = 'employee_ids' AND jsonb_typeof("hr_document_requirement"."applicability_json"->'employeeIds') = 'array' AND jsonb_array_length("hr_document_requirement"."applicability_json"->'employeeIds') > 0)))
);
--> statement-breakpoint
CREATE TABLE "hr_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_number" text NOT NULL,
	"normalized_employee_number" text NOT NULL,
	"legal_name" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_org_id_uidx" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "hr_employee_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"case_type" text NOT NULL,
	"status" text NOT NULL,
	"severity" text NOT NULL,
	"allegation_summary" text NOT NULL,
	"classification_code" text NOT NULL,
	"owner_actor_user_id" text NOT NULL,
	"subject_actor_user_id" text,
	"participants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflicted_actor_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interim_authority" text,
	"interim_reason" text,
	"interim_starts_on" date,
	"interim_review_on" date,
	"interim_status" text,
	"finding_code" text,
	"finding_summary" text,
	"finding_recorded_by" text,
	"finding_recorded_at" timestamp with time zone,
	"outcome_code" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_case_case_type_check" CHECK ("hr_employee_case"."case_type" IN ('grievance', 'conduct', 'attendance_misconduct', 'workplace_conflict', 'harassment', 'policy_breach', 'disciplinary_review')),
	CONSTRAINT "hr_employee_case_status_check" CHECK ("hr_employee_case"."status" IN ('open', 'investigating', 'finding_recorded', 'action_pending', 'action_approved', 'under_appeal', 'closed')),
	CONSTRAINT "hr_employee_case_severity_check" CHECK ("hr_employee_case"."severity" IN ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "hr_employee_case_interim_status_check" CHECK ("hr_employee_case"."interim_status" IS NULL OR "hr_employee_case"."interim_status" IN ('active', 'expired', 'lifted'))
);
--> statement-breakpoint
CREATE TABLE "hr_employee_case_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"status" text NOT NULL,
	"recommended_by" text NOT NULL,
	"approved_by" text,
	"policy_validation_recorded" boolean DEFAULT false NOT NULL,
	"recommendation_note" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_case_action_action_type_check" CHECK ("hr_employee_case_action"."action_type" IN ('warning', 'training', 'suspension_recommendation', 'termination_recommendation', 'other_policy_action')),
	CONSTRAINT "hr_employee_case_action_status_check" CHECK ("hr_employee_case_action"."status" IN ('recommended', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "hr_employee_case_appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"original_finding_code" text NOT NULL,
	"original_finding_recorded_at" timestamp with time zone NOT NULL,
	"appeal_grounds_summary" text NOT NULL,
	"status" text NOT NULL,
	"appeal_outcome_code" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_case_appeal_status_check" CHECK ("hr_employee_case_appeal"."status" IN ('open', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "hr_employee_case_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"event_kind" text NOT NULL,
	"sequence_no" integer NOT NULL,
	"document_ref" text,
	"payload_json" jsonb,
	"redacts_event_id" uuid,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employee_certification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completion_id" uuid NOT NULL,
	"certification_code" text NOT NULL,
	"issued_on" date NOT NULL,
	"expires_on" date,
	"status" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"renewed_from_certification_id" uuid,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_certification_status_check" CHECK ("hr_employee_certification"."status" IN ('active', 'expired', 'revoked')),
	CONSTRAINT "hr_employee_certification_expiry_check" CHECK ("hr_employee_certification"."expires_on" IS NULL OR "hr_employee_certification"."expires_on" >= "hr_employee_certification"."issued_on")
);
--> statement-breakpoint
CREATE TABLE "hr_employee_compensation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"grade_id" uuid,
	"salary_band_id" uuid,
	"base_amount" text NOT NULL,
	"currency_code" text NOT NULL,
	"pay_frequency" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"reason" text NOT NULL,
	"confidential_note" text,
	"supersedes_compensation_id" uuid,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"status" text NOT NULL,
	"source_review_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_compensation_effective_range_ck" CHECK ("hr_employee_compensation"."effective_to" IS NULL OR "hr_employee_compensation"."effective_from" <= "hr_employee_compensation"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "hr_employee_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"requirement_id" uuid,
	"document_type" text NOT NULL,
	"issuing_jurisdiction" text,
	"issued_on" date NOT NULL,
	"expires_on" date,
	"verification_status" text NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"document_ref" text NOT NULL,
	"identifier_last4" text,
	"identifier_fingerprint" text,
	"metadata_json" jsonb,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employee_document_verification_status_check" CHECK ("hr_employee_document"."verification_status" IN ('pending', 'verified', 'rejected', 'revoked', 'expired')),
	CONSTRAINT "hr_employee_document_expiry_check" CHECK ("hr_employee_document"."expires_on" IS NULL OR "hr_employee_document"."expires_on" >= "hr_employee_document"."issued_on")
);
--> statement-breakpoint
CREATE TABLE "hr_employment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employment_effective_range_ck" CHECK ("hr_employment"."ends_on" IS NULL OR "hr_employment"."starts_on" <= "hr_employment"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "hr_employment_calendar_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"calendar_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"location_code" text,
	"jurisdiction" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employment_calendar_assignment_effective_range_check" CHECK ("hr_employment_calendar_assignment"."effective_to" IS NULL OR "hr_employment_calendar_assignment"."effective_to" >= "hr_employment_calendar_assignment"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_employment_confirmation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"confirmed_on" date NOT NULL,
	"confirmed_by" text NOT NULL,
	"evidence_note" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employment_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reference_code" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"lineage_status" text NOT NULL,
	"supersedes_contract_id" uuid,
	"superseded_by_contract_id" uuid,
	"reason_code" text NOT NULL,
	"source_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employment_contract_effective_range_ck" CHECK ("hr_employment_contract"."ends_on" IS NULL OR "hr_employment_contract"."starts_on" <= "hr_employment_contract"."ends_on"),
	CONSTRAINT "hr_employment_contract_lineage_status_check" CHECK ("hr_employment_contract"."lineage_status" IN ('active', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "hr_employment_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"movement_kind" text NOT NULL,
	"from_assignment_id" uuid NOT NULL,
	"to_assignment_id" uuid NOT NULL,
	"from_position_id" uuid NOT NULL,
	"to_position_id" uuid NOT NULL,
	"effective_on" date NOT NULL,
	"reason" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employment_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"compensation_proposal_id" uuid,
	"status" text NOT NULL,
	"terms_summary" text NOT NULL,
	"expires_on" date NOT NULL,
	"issued_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"accept_idempotency_key" text,
	"accept_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"starts_on_snapshot" date NOT NULL,
	"ends_on_snapshot" date,
	"effective_on" date NOT NULL,
	"change_kind" text NOT NULL,
	"reason" text,
	"evidence_reference" text,
	"correlation_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_employment_status_history_change_kind_check" CHECK ("hr_employment_status_history"."change_kind" IN ('create', 'lifecycle', 'correction')),
	CONSTRAINT "hr_employment_status_history_to_status_check" CHECK ("hr_employment_status_history"."to_status" IN ('active', 'notice', 'terminated'))
);
--> statement-breakpoint
CREATE TABLE "hr_exit_interview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"conducted_on" date NOT NULL,
	"notes" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_headcount_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"planning_scope_key" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text NOT NULL,
	"plan_version" integer DEFAULT 1 NOT NULL,
	"supersedes_plan_id" uuid,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejected_by" text,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"cost_envelope_amount" text,
	"cost_envelope_currency_code" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_headcount_plan_status_check" CHECK ("hr_headcount_plan"."status" IN ('draft', 'submitted', 'approved', 'rejected', 'superseded', 'closed')),
	CONSTRAINT "hr_headcount_plan_period_range_check" CHECK ("hr_headcount_plan"."period_end" >= "hr_headcount_plan"."period_start")
);
--> statement-breakpoint
CREATE TABLE "hr_headcount_plan_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"department_id" uuid,
	"job_id" uuid,
	"position_id" uuid,
	"location_code" text,
	"employment_type" text,
	"planned_fte" numeric(10, 4) NOT NULL,
	"planned_headcount" integer NOT NULL,
	"cost_envelope_amount" text,
	"cost_envelope_currency_code" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_headcount_plan_line_employment_type_check" CHECK ("hr_headcount_plan_line"."employment_type" IS NULL OR "hr_headcount_plan_line"."employment_type" IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')),
	CONSTRAINT "hr_headcount_plan_line_planned_fte_nonneg_check" CHECK ("hr_headcount_plan_line"."planned_fte" >= 0),
	CONSTRAINT "hr_headcount_plan_line_planned_headcount_nonneg_check" CHECK ("hr_headcount_plan_line"."planned_headcount" >= 0),
	CONSTRAINT "hr_headcount_plan_line_capacity_positive_check" CHECK ("hr_headcount_plan_line"."planned_fte" > 0 OR "hr_headcount_plan_line"."planned_headcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "hr_headcount_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_line_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"reserved_fte" numeric(10, 4) NOT NULL,
	"reserved_headcount" integer NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_headcount_reservation_status_check" CHECK ("hr_headcount_reservation"."status" IN ('active', 'released', 'consumed')),
	CONSTRAINT "hr_headcount_reservation_reserved_fte_nonneg_check" CHECK ("hr_headcount_reservation"."reserved_fte" >= 0),
	CONSTRAINT "hr_headcount_reservation_reserved_headcount_nonneg_check" CHECK ("hr_headcount_reservation"."reserved_headcount" >= 0),
	CONSTRAINT "hr_headcount_reservation_capacity_positive_check" CHECK ("hr_headcount_reservation"."reserved_fte" > 0 OR "hr_headcount_reservation"."reserved_headcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "hr_hire_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offer_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"current_step" text,
	"person_id" uuid,
	"employee_id" uuid,
	"employment_id" uuid,
	"worker_id" uuid,
	"assignment_id" uuid,
	"onboarding_case_id" uuid,
	"compensation_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_interview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"interviewer_actor_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_interview_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"interview_id" uuid NOT NULL,
	"result" text NOT NULL,
	"private_notes" text,
	"scorecard_json" jsonb NOT NULL,
	"evaluator_actor_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_interview_evaluation_scorecard_json_check" CHECK (jsonb_typeof("hr_interview_evaluation"."scorecard_json") = 'object'
				AND jsonb_typeof("hr_interview_evaluation"."scorecard_json"->'criteria') = 'array'
				AND jsonb_array_length("hr_interview_evaluation"."scorecard_json"->'criteria') BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE TABLE "hr_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_job_org_id_uidx" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "hr_job_competency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"required_level" integer NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_job_competency_status_check" CHECK ("hr_job_competency"."status" IN ('active', 'removed')),
	CONSTRAINT "hr_job_competency_required_level_check" CHECK ("hr_job_competency"."required_level" >= 1 AND "hr_job_competency"."required_level" <= 5)
);
--> statement-breakpoint
CREATE TABLE "hr_job_definition_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"title" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_definition_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_job_definition_version_lineage_status_check" CHECK ("hr_job_definition_version"."lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_job_definition_version_date_range_check" CHECK ("hr_job_definition_version"."effective_to" IS NULL OR "hr_job_definition_version"."effective_to" >= "hr_job_definition_version"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_job_requisition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"job_id" uuid,
	"position_id" uuid,
	"department_id" uuid,
	"hiring_manager_employee_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_learning_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_learning_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"session_id" uuid,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"due_on" date,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_learning_assignment_status_check" CHECK ("hr_learning_assignment"."status" IN ('pending', 'in_progress', 'completed', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "hr_learning_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_learning_attendance_status_check" CHECK ("hr_learning_attendance"."status" IN ('present', 'absent', 'late', 'excused'))
);
--> statement-breakpoint
CREATE TABLE "hr_learning_completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"session_id" uuid,
	"completed_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"assessor_user_id" text,
	"notes" text,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_learning_completion_outcome_check" CHECK ("hr_learning_completion"."outcome" IN ('passed', 'failed', 'attended'))
);
--> statement-breakpoint
CREATE TABLE "hr_learning_course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_hours" numeric(10, 2),
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_learning_course_status_check" CHECK ("hr_learning_course"."status" IN ('active', 'superseded', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hr_learning_program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_learning_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"scheduled_starts_at" timestamp with time zone NOT NULL,
	"scheduled_ends_at" timestamp with time zone NOT NULL,
	"actual_starts_at" timestamp with time zone,
	"actual_ends_at" timestamp with time zone,
	"status" text NOT NULL,
	"capacity" integer,
	"primary_instructor_user_id" text,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_learning_session_status_check" CHECK ("hr_learning_session"."status" IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
	CONSTRAINT "hr_learning_session_scheduled_range_check" CHECK ("hr_learning_session"."scheduled_ends_at" >= "hr_learning_session"."scheduled_starts_at"),
	CONSTRAINT "hr_learning_session_actual_range_check" CHECK ("hr_learning_session"."actual_ends_at" IS NULL OR "hr_learning_session"."actual_starts_at" IS NULL OR "hr_learning_session"."actual_ends_at" >= "hr_learning_session"."actual_starts_at")
);
--> statement-breakpoint
CREATE TABLE "hr_leave_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"source_request_id" uuid,
	"kind" text NOT NULL,
	"delta" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_adjustment_kind_check" CHECK ("hr_leave_adjustment"."kind" IN ('manual', 'accrual', 'carry_forward', 'expiry', 'consumption', 'cancellation_reversal')),
	CONSTRAINT "hr_leave_adjustment_status_check" CHECK ("hr_leave_adjustment"."status" IN ('posted')),
	CONSTRAINT "hr_leave_adjustment_delta_nonzero_check" CHECK ("hr_leave_adjustment"."delta"::numeric <> 0)
);
--> statement-breakpoint
CREATE TABLE "hr_leave_approval_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"decided_by" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_approval_decision_decision_check" CHECK ("hr_leave_approval_decision"."decision" IN ('approved', 'rejected', 'returned', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hr_leave_entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"opening_quantity" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_entitlement_status_check" CHECK ("hr_leave_entitlement"."status" IN ('active', 'expired', 'carried_forward', 'closed')),
	CONSTRAINT "hr_leave_entitlement_period_range_check" CHECK ("hr_leave_entitlement"."period_end" >= "hr_leave_entitlement"."period_start"),
	CONSTRAINT "hr_leave_entitlement_opening_nonneg_check" CHECK ("hr_leave_entitlement"."opening_quantity"::numeric >= 0)
);
--> statement-breakpoint
CREATE TABLE "hr_leave_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"leave_type" text NOT NULL,
	"unit" text NOT NULL,
	"paid" boolean NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"allows_negative_balance" boolean DEFAULT false NOT NULL,
	"allow_self_approval" boolean DEFAULT false NOT NULL,
	"allows_partial_day" boolean DEFAULT false NOT NULL,
	"accrual_basis" text DEFAULT 'none' NOT NULL,
	"accrual_frequency" text,
	"accrual_quantity_per_period" text,
	"carry_forward_enabled" boolean DEFAULT false NOT NULL,
	"carry_forward_max_quantity" text,
	"entitlement_expiry_rule" text DEFAULT 'none' NOT NULL,
	"entitlement_expiry_days" integer,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text NOT NULL,
	"supersedes_policy_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_policy_status_check" CHECK ("hr_leave_policy"."status" IN ('draft', 'published', 'superseded', 'archived')),
	CONSTRAINT "hr_leave_policy_unit_check" CHECK ("hr_leave_policy"."unit" IN ('days', 'hours')),
	CONSTRAINT "hr_leave_policy_leave_type_check" CHECK ("hr_leave_policy"."leave_type" IN ('annual', 'sick', 'unpaid', 'other')),
	CONSTRAINT "hr_leave_policy_date_range_check" CHECK ("hr_leave_policy"."effective_to" IS NULL OR "hr_leave_policy"."effective_to" >= "hr_leave_policy"."effective_from"),
	CONSTRAINT "hr_leave_policy_accrual_basis_check" CHECK ("hr_leave_policy"."accrual_basis" IN ('none', 'periodic', 'anniversary')),
	CONSTRAINT "hr_leave_policy_accrual_frequency_check" CHECK ("hr_leave_policy"."accrual_frequency" IS NULL OR "hr_leave_policy"."accrual_frequency" IN ('monthly', 'annual')),
	CONSTRAINT "hr_leave_policy_entitlement_expiry_rule_check" CHECK ("hr_leave_policy"."entitlement_expiry_rule" IN ('none', 'period_end', 'days_after_period_end')),
	CONSTRAINT "hr_leave_policy_accrual_config_check" CHECK (("hr_leave_policy"."accrual_basis" = 'none' AND "hr_leave_policy"."accrual_frequency" IS NULL AND "hr_leave_policy"."accrual_quantity_per_period" IS NULL) OR ("hr_leave_policy"."accrual_basis" <> 'none' AND "hr_leave_policy"."accrual_frequency" IS NOT NULL AND "hr_leave_policy"."accrual_quantity_per_period" IS NOT NULL)),
	CONSTRAINT "hr_leave_policy_carry_forward_check" CHECK (("hr_leave_policy"."carry_forward_enabled" = false AND "hr_leave_policy"."carry_forward_max_quantity" IS NULL) OR ("hr_leave_policy"."carry_forward_enabled" = true)),
	CONSTRAINT "hr_leave_policy_entitlement_expiry_days_check" CHECK (("hr_leave_policy"."entitlement_expiry_rule" = 'days_after_period_end' AND "hr_leave_policy"."entitlement_expiry_days" IS NOT NULL) OR ("hr_leave_policy"."entitlement_expiry_rule" <> 'days_after_period_end' AND "hr_leave_policy"."entitlement_expiry_days" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "hr_leave_policy_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"policy_id" uuid NOT NULL,
	"min_tenure_days" integer,
	"allowed_employment_statuses" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"requested_quantity" text NOT NULL,
	"unit" text NOT NULL,
	"status" text NOT NULL,
	"is_backdated" boolean DEFAULT false NOT NULL,
	"backdate_justification" text,
	"approved_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_request_status_check" CHECK ("hr_leave_request"."status" IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'withdrawn', 'cancelled')),
	CONSTRAINT "hr_leave_request_unit_check" CHECK ("hr_leave_request"."unit" IN ('days', 'hours')),
	CONSTRAINT "hr_leave_request_date_range_check" CHECK ("hr_leave_request"."end_date" >= "hr_leave_request"."start_date"),
	CONSTRAINT "hr_leave_request_quantity_pos_check" CHECK ("hr_leave_request"."requested_quantity"::numeric > 0)
);
--> statement-breakpoint
CREATE TABLE "hr_leave_request_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"segment_date" date NOT NULL,
	"quantity" text NOT NULL,
	"day_portion" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_leave_request_segment_day_portion_check" CHECK ("hr_leave_request_segment"."day_portion" IN ('morning', 'afternoon', 'full'))
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_access_revocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"revoked_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_offboarding_access_revocation_status_check" CHECK ("hr_offboarding_access_revocation"."status" IN ('pending', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"termination_id" uuid,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_payroll_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"offboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"ready_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_offboarding_payroll_handoff_status_check" CHECK ("hr_offboarding_payroll_handoff"."status" IN ('pending', 'ready'))
);
--> statement-breakpoint
CREATE TABLE "hr_offboarding_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"mandatory" boolean NOT NULL,
	"status" text NOT NULL,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_access_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"granted_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_access_handoff_status_check" CHECK ("hr_onboarding_access_handoff"."status" IN ('pending', 'granted'))
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"source_offer_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_equipment_handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"handed_over_on" date,
	"summary" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_equipment_handoff_status_check" CHECK ("hr_onboarding_equipment_handoff"."status" IN ('pending', 'handed_over'))
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_orientation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"onboarding_case_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"acknowledged_on" date,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_onboarding_orientation_status_check" CHECK ("hr_onboarding_orientation"."status" IN ('pending', 'acknowledged'))
);
--> statement-breakpoint
CREATE TABLE "hr_onboarding_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"mandatory" boolean NOT NULL,
	"status" text NOT NULL,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_overtime_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"overtime_request_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"approved_maximum_minutes" integer,
	"actor_user_id" text NOT NULL,
	"authority" text,
	"comment" text,
	"decided_at" timestamp with time zone NOT NULL,
	"correlation_id" text,
	"version_approved" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_overtime_approval_decision_check" CHECK ("hr_overtime_approval"."decision" IN ('approved', 'rejected', 'verified', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hr_overtime_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"overtime_type" text NOT NULL,
	"requested_starts_at" timestamp with time zone NOT NULL,
	"requested_ends_at" timestamp with time zone NOT NULL,
	"requested_minutes" integer NOT NULL,
	"approved_maximum_minutes" integer,
	"actual_minutes" integer,
	"payroll_approved_minutes" integer,
	"reason" text NOT NULL,
	"evidence_reference" text,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_overtime_request_type_check" CHECK ("hr_overtime_request"."overtime_type" IN ('weekday_overtime', 'rest_day_overtime', 'public_holiday_overtime', 'night_overtime', 'call_back', 'emergency_overtime')),
	CONSTRAINT "hr_overtime_request_status_check" CHECK ("hr_overtime_request"."status" IN ('requested', 'approved', 'rejected', 'worked', 'verified', 'cancelled')),
	CONSTRAINT "hr_overtime_request_range_check" CHECK ("hr_overtime_request"."requested_ends_at" > "hr_overtime_request"."requested_starts_at"),
	CONSTRAINT "hr_overtime_request_minutes_check" CHECK ("hr_overtime_request"."requested_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "hr_performance_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"rating" text,
	"comments_sensitive" text,
	"submitted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_assessment_kind_check" CHECK ("hr_performance_assessment"."kind" IN ('self', 'manager', 'delegated'))
);
--> statement-breakpoint
CREATE TABLE "hr_performance_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"rating_scale" jsonb NOT NULL,
	"weighting_model" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_cycle_status_check" CHECK ("hr_performance_cycle"."status" IN ('draft', 'published', 'open', 'closed', 'cancelled')),
	CONSTRAINT "hr_performance_cycle_weighting_model_check" CHECK ("hr_performance_cycle"."weighting_model" IN ('none', 'percent100')),
	CONSTRAINT "hr_performance_cycle_period_range_check" CHECK ("hr_performance_cycle"."period_end" >= "hr_performance_cycle"."period_start")
);
--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"min_tenure_days" integer,
	"allowed_employment_statuses" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_cycle_participant_status_check" CHECK ("hr_performance_cycle_participant"."status" IN ('active', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "hr_performance_cycle_review_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_cycle_review_period_kind_check" CHECK ("hr_performance_cycle_review_period"."kind" IN ('goal_setting', 'self_review', 'manager_review', 'calibration')),
	CONSTRAINT "hr_performance_cycle_review_period_range_check" CHECK ("hr_performance_cycle_review_period"."period_end" >= "hr_performance_cycle_review_period"."period_start")
);
--> statement-breakpoint
CREATE TABLE "hr_performance_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"weight" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"exception_outside_cycle" boolean DEFAULT false NOT NULL,
	"goal_kind" text DEFAULT 'employee' NOT NULL,
	"aligned_to_goal_id" uuid,
	"completion_note" text,
	"completion_evidence_reference" text,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_goal_status_check" CHECK ("hr_performance_goal"."status" IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed', 'cancelled')),
	CONSTRAINT "hr_performance_goal_goal_kind_check" CHECK ("hr_performance_goal"."goal_kind" IN ('employee', 'manager')),
	CONSTRAINT "hr_performance_goal_period_range_check" CHECK ("hr_performance_goal"."period_end" >= "hr_performance_goal"."period_start")
);
--> statement-breakpoint
CREATE TABLE "hr_performance_goal_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goal_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"progress_note" text NOT NULL,
	"progress_value" text,
	"evidence_reference" text,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_performance_improvement_checkpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"outcome" text NOT NULL,
	"notes" text,
	"evidence_reference" text,
	"recorded_by" text,
	"recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_improvement_checkpoint_outcome_check" CHECK ("hr_performance_improvement_checkpoint"."outcome" IN ('pending', 'met', 'missed'))
);
--> statement-breakpoint
CREATE TABLE "hr_performance_improvement_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"performance_gap" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"measurable_actions" text NOT NULL,
	"support_resources" text NOT NULL,
	"due_date" date NOT NULL,
	"accountable_manager_employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"outcome_reason" text,
	"outcome_evidence_reference" text,
	"last_extension_reason" text,
	"last_extension_evidence_reference" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_improvement_plan_status_check" CHECK ("hr_performance_improvement_plan"."status" IN ('draft', 'open', 'acknowledged', 'completed', 'unsuccessful', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "hr_performance_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"overall_rating" text,
	"acknowledgement_note" text,
	"calibration_note" text,
	"status" text NOT NULL,
	"finalize_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_review_status_check" CHECK ("hr_performance_review"."status" IN ('draft', 'self_submitted', 'manager_submitted', 'returned', 'acknowledged', 'finalized', 'reopened'))
);
--> statement-breakpoint
CREATE TABLE "hr_performance_review_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"role" text NOT NULL,
	"employee_id" uuid,
	"user_id" text,
	"sequence_number" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_review_participant_role_check" CHECK ("hr_performance_review_participant"."role" IN ('self', 'manager', 'delegated'))
);
--> statement-breakpoint
CREATE TABLE "hr_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"preferred_name" text,
	"privacy_classification" text DEFAULT 'workforce_core' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "hr_person_privacy_classification_check" CHECK ("hr_person"."privacy_classification" IN ('workforce_core', 'pay_and_benefits', 'medical_and_leave', 'recruitment_and_background', 'employee_relations_and_legal', 'performance_and_talent'))
);
--> statement-breakpoint
CREATE TABLE "hr_person_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"value_text" text NOT NULL,
	"normalized_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_contact_type_check" CHECK ("hr_person_contact"."contact_type" IN ('email', 'phone', 'postal_address')),
	CONSTRAINT "hr_person_contact_status_check" CHECK ("hr_person_contact"."status" IN ('active', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "hr_person_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_fingerprint" text NOT NULL,
	"identifier_last4" text NOT NULL,
	"document_ref" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_identifier_status_check" CHECK ("hr_person_identifier"."status" IN ('active', 'retired')),
	CONSTRAINT "hr_person_identifier_date_range_check" CHECK ("hr_person_identifier"."effective_to" IS NULL OR "hr_person_identifier"."effective_to" >= "hr_person_identifier"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_person_identity_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_identity_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_identity_version_lineage_status_check" CHECK ("hr_person_identity_version"."lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_person_identity_version_date_range_check" CHECK ("hr_person_identity_version"."effective_to" IS NULL OR "hr_person_identity_version"."effective_to" >= "hr_person_identity_version"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_policy_acknowledgement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"policy_code" text NOT NULL,
	"policy_version" text NOT NULL,
	"requirement_status" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"due_on" date NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"supersedes_acknowledgement_id" uuid,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_policy_acknowledgement_status_check" CHECK ("hr_policy_acknowledgement"."requirement_status" IN ('outstanding', 'acknowledged', 'revoked', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "hr_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"department_id" uuid,
	"job_id" uuid,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_position_org_id_uidx" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "hr_position_definition_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"position_id" uuid NOT NULL,
	"title" text NOT NULL,
	"department_id" uuid,
	"job_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_definition_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_position_definition_version_lineage_status_check" CHECK ("hr_position_definition_version"."lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_position_definition_version_date_range_check" CHECK ("hr_position_definition_version"."effective_to" IS NULL OR "hr_position_definition_version"."effective_to" >= "hr_position_definition_version"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_probation_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"probation_review_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewed_on" date NOT NULL,
	"reason" text NOT NULL,
	"evidence_reference" text,
	"actor_user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_probation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"outcome" text,
	"outcome_actor_id" text,
	"outcome_recorded_on" date,
	"last_extension_reason" text,
	"last_extension_evidence_reference" text,
	"outcome_reason" text,
	"outcome_evidence_reference" text,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_probation_review_effective_range_ck" CHECK ("hr_probation_review"."starts_on" <= "hr_probation_review"."ends_on"),
	CONSTRAINT "hr_probation_review_outcome_recorded_on_range_ck" CHECK ("hr_probation_review"."outcome_recorded_on" IS NULL OR ("hr_probation_review"."starts_on" <= "hr_probation_review"."outcome_recorded_on" AND "hr_probation_review"."outcome_recorded_on" <= "hr_probation_review"."ends_on"))
);
--> statement-breakpoint
CREATE TABLE "hr_reporting_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_employee_id" uuid NOT NULL,
	"relationship_kind" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"supersedes_reporting_line_id" uuid,
	"superseded_by_reporting_line_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_reporting_line_effective_range_ck" CHECK ("hr_reporting_line"."ends_on" IS NULL OR "hr_reporting_line"."starts_on" <= "hr_reporting_line"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "hr_salary_band" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"grade_id" uuid NOT NULL,
	"minimum_amount" text NOT NULL,
	"midpoint_amount" text NOT NULL,
	"maximum_amount" text NOT NULL,
	"currency_code" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_salary_band_id" uuid,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_salary_band_effective_range_ck" CHECK ("hr_salary_band"."effective_to" IS NULL OR "hr_salary_band"."effective_from" <= "hr_salary_band"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "hr_shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"shift_kind" text NOT NULL,
	"start_local" text NOT NULL,
	"end_local" text NOT NULL,
	"is_overnight" boolean DEFAULT false NOT NULL,
	"expected_minutes" integer NOT NULL,
	"grace_early_minutes" integer DEFAULT 0 NOT NULL,
	"grace_late_minutes" integer DEFAULT 0 NOT NULL,
	"min_duration_minutes" integer,
	"max_duration_minutes" integer,
	"earliest_clock_in_local" text,
	"latest_clock_out_local" text,
	"overtime_eligible" boolean DEFAULT true NOT NULL,
	"timezone" text,
	"location_key" text,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_shift_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_kind_check" CHECK ("hr_shift"."shift_kind" IN ('fixed', 'flexible', 'split', 'rest_day', 'public_holiday')),
	CONSTRAINT "hr_shift_status_check" CHECK ("hr_shift"."status" IN ('draft', 'active', 'superseded', 'inactive')),
	CONSTRAINT "hr_shift_expected_minutes_check" CHECK ("hr_shift"."expected_minutes" > 0 AND "hr_shift"."expected_minutes" <= 1440),
	CONSTRAINT "hr_shift_effective_range_ck" CHECK ("hr_shift"."effective_to" IS NULL OR "hr_shift"."effective_from" <= "hr_shift"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "hr_shift_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"shift_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location_key" text,
	"timezone" text NOT NULL,
	"publication_status" text NOT NULL,
	"assignment_source" text DEFAULT 'manual' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_assignment_status_check" CHECK ("hr_shift_assignment"."publication_status" IN ('planned', 'published', 'changed', 'cancelled', 'completed')),
	CONSTRAINT "hr_shift_assignment_range_check" CHECK ("hr_shift_assignment"."ends_at" > "hr_shift_assignment"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "hr_shift_assignment_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"segment_order" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_assignment_segment_range_check" CHECK ("hr_shift_assignment_segment"."ends_at" > "hr_shift_assignment_segment"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "hr_shift_break" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"shift_id" uuid NOT NULL,
	"break_order" integer DEFAULT 1 NOT NULL,
	"start_offset_minutes" integer,
	"duration_minutes" integer NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_shift_break_duration_check" CHECK ("hr_shift_break"."duration_minutes" > 0 AND "hr_shift_break"."duration_minutes" <= 720)
);
--> statement-breakpoint
CREATE TABLE "hr_succession_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"succession_plan_id" uuid NOT NULL,
	"employee_id" uuid,
	"external_candidate_ref" text,
	"nominator_user_id" text NOT NULL,
	"readiness" text NOT NULL,
	"readiness_effective_on" date NOT NULL,
	"evidence_summary" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_succession_candidate_status_check" CHECK ("hr_succession_candidate"."status" IN ('nominated', 'approved', 'removed')),
	CONSTRAINT "hr_succession_candidate_readiness_check" CHECK ("hr_succession_candidate"."readiness" IN ('not_ready', 'ready_soon', 'ready_now', 'emerging'))
);
--> statement-breakpoint
CREATE TABLE "hr_succession_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"position_id" uuid NOT NULL,
	"status" text NOT NULL,
	"allows_external_candidates" boolean DEFAULT false NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_succession_plan_status_check" CHECK ("hr_succession_plan"."status" IN ('draft', 'active', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_critical_role_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"talent_profile_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"readiness" text NOT NULL,
	"readiness_effective_on" date NOT NULL,
	"evidence_summary" text NOT NULL,
	"assessor_user_id" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_critical_role_readiness_status_check" CHECK ("hr_talent_critical_role_readiness"."status" IN ('current', 'superseded')),
	CONSTRAINT "hr_talent_critical_role_readiness_readiness_check" CHECK ("hr_talent_critical_role_readiness"."readiness" IN ('not_ready', 'ready_soon', 'ready_now', 'emerging'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_pool_status_check" CHECK ("hr_talent_pool"."status" IN ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_pool_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pool_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"nominator_user_id" text NOT NULL,
	"status" text NOT NULL,
	"nominated_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"approver_user_id" text,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_pool_member_status_check" CHECK ("hr_talent_pool_member"."status" IN ('nominated', 'approved', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"summary" text,
	"current_classification" text,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_profile_status_check" CHECK ("hr_talent_profile"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_profile_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"talent_profile_id" uuid NOT NULL,
	"method_code" text NOT NULL,
	"classification" text NOT NULL,
	"evidence_summary" text NOT NULL,
	"assessor_user_id" text NOT NULL,
	"status" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_profile_assessment_status_check" CHECK ("hr_talent_profile_assessment"."status" IN ('draft', 'confirmed', 'superseded')),
	CONSTRAINT "hr_talent_profile_assessment_method_code_check" CHECK ("hr_talent_profile_assessment"."method_code" IN ('calibration_panel', 'assessment_center', 'manager_evidence_review'))
);
--> statement-breakpoint
CREATE TABLE "hr_talent_profile_mobility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"talent_profile_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"preference_code" text NOT NULL,
	"scope_detail" text,
	"evidence_summary" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_profile_mobility_dimension_check" CHECK ("hr_talent_profile_mobility"."dimension" IN ('geographic', 'functional', 'organizational')),
	CONSTRAINT "hr_talent_profile_mobility_preference_code_check" CHECK ("hr_talent_profile_mobility"."preference_code" IN ('open', 'limited', 'not_open')),
	CONSTRAINT "hr_talent_profile_mobility_status_check" CHECK ("hr_talent_profile_mobility"."status" IN ('current', 'superseded')),
	CONSTRAINT "hr_talent_profile_mobility_effective_range_check" CHECK ("hr_talent_profile_mobility"."effective_to" IS NULL OR "hr_talent_profile_mobility"."effective_to" >= "hr_talent_profile_mobility"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_termination" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_detail" text NOT NULL,
	"effective_on" date NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"rehire_eligible" boolean DEFAULT true NOT NULL,
	"finalized_at" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_time_approval_authority_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"authority" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_approval_authority_assignment_authority_check" CHECK ("hr_time_approval_authority_assignment"."authority" IN ('line_manager', 'department', 'hr', 'payroll')),
	CONSTRAINT "hr_time_approval_authority_assignment_effective_range_check" CHECK ("hr_time_approval_authority_assignment"."effective_to" IS NULL OR "hr_time_approval_authority_assignment"."effective_to" >= "hr_time_approval_authority_assignment"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_time_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"minimum_rest_minutes" integer NOT NULL,
	"automatic_break_after_minutes" integer,
	"automatic_break_minutes" integer DEFAULT 0 NOT NULL,
	"approval_steps" jsonb DEFAULT '["line_manager"]'::jsonb NOT NULL,
	"supersedes_policy_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_policy_status_check" CHECK ("hr_time_policy"."status" IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "hr_time_policy_effective_range_check" CHECK ("hr_time_policy"."effective_to" IS NULL OR "hr_time_policy"."effective_to" >= "hr_time_policy"."effective_from"),
	CONSTRAINT "hr_time_policy_minimum_rest_check" CHECK ("hr_time_policy"."minimum_rest_minutes" >= 0 AND "hr_time_policy"."minimum_rest_minutes" <= 2880),
	CONSTRAINT "hr_time_policy_break_check" CHECK (
				"hr_time_policy"."automatic_break_minutes" >= 0
				AND "hr_time_policy"."automatic_break_minutes" <= 1440
				AND (
					("hr_time_policy"."automatic_break_after_minutes" IS NULL AND "hr_time_policy"."automatic_break_minutes" = 0)
					OR (
						"hr_time_policy"."automatic_break_after_minutes" > 0
						AND "hr_time_policy"."automatic_break_after_minutes" <= 1440
						AND "hr_time_policy"."automatic_break_minutes" <= "hr_time_policy"."automatic_break_after_minutes"
					)
				)
			),
	CONSTRAINT "hr_time_policy_approval_steps_check" CHECK (
				jsonb_typeof("hr_time_policy"."approval_steps") = 'array'
				AND jsonb_array_length("hr_time_policy"."approval_steps") BETWEEN 1 AND 4
				AND "hr_time_policy"."approval_steps" <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
				AND (
					jsonb_array_length("hr_time_policy"."approval_steps") = 1
					OR (
						jsonb_array_length("hr_time_policy"."approval_steps") = 2
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>1
					)
					OR (
						jsonb_array_length("hr_time_policy"."approval_steps") = 3
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>1
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>2
						AND "hr_time_policy"."approval_steps"->>1 <> "hr_time_policy"."approval_steps"->>2
					)
					OR (
						jsonb_array_length("hr_time_policy"."approval_steps") = 4
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>1
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>2
						AND "hr_time_policy"."approval_steps"->>0 <> "hr_time_policy"."approval_steps"->>3
						AND "hr_time_policy"."approval_steps"->>1 <> "hr_time_policy"."approval_steps"->>2
						AND "hr_time_policy"."approval_steps"->>1 <> "hr_time_policy"."approval_steps"->>3
						AND "hr_time_policy"."approval_steps"->>2 <> "hr_time_policy"."approval_steps"->>3
					)
				)
			)
);
--> statement-breakpoint
CREATE TABLE "hr_time_policy_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"policy_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_time_policy_assignment_effective_range_check" CHECK ("hr_time_policy_assignment"."effective_to" IS NULL OR "hr_time_policy_assignment"."effective_to" >= "hr_time_policy_assignment"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_timesheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"employment_id" uuid,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text NOT NULL,
	"total_recorded_minutes" integer DEFAULT 0 NOT NULL,
	"total_approved_minutes" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone,
	"submission_reference" uuid,
	"approval_policy_id" uuid,
	"required_approval_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_approval_steps" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"returned_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"approver_notes" text,
	"rejection_reason" text,
	"supersedes_timesheet_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_status_check" CHECK ("hr_timesheet"."status" IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'locked', 'superseded')),
	CONSTRAINT "hr_timesheet_period_check" CHECK ("hr_timesheet"."period_end" >= "hr_timesheet"."period_start"),
	CONSTRAINT "hr_timesheet_minutes_check" CHECK ("hr_timesheet"."total_recorded_minutes" >= 0 AND "hr_timesheet"."total_approved_minutes" >= 0),
	CONSTRAINT "hr_timesheet_approval_progress_check" CHECK (
				jsonb_typeof("hr_timesheet"."required_approval_steps") = 'array'
				AND jsonb_array_length("hr_timesheet"."required_approval_steps") <= 4
				AND "hr_timesheet"."required_approval_steps" <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
				AND (
					"hr_timesheet"."status" <> 'submitted'
					OR jsonb_array_length("hr_timesheet"."required_approval_steps") >= 1
				)
				AND (
					jsonb_array_length("hr_timesheet"."required_approval_steps") <= 1
					OR (
						jsonb_array_length("hr_timesheet"."required_approval_steps") = 2
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>1
					)
					OR (
						jsonb_array_length("hr_timesheet"."required_approval_steps") = 3
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>1
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>2
						AND "hr_timesheet"."required_approval_steps"->>1 <> "hr_timesheet"."required_approval_steps"->>2
					)
					OR (
						jsonb_array_length("hr_timesheet"."required_approval_steps") = 4
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>1
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>2
						AND "hr_timesheet"."required_approval_steps"->>0 <> "hr_timesheet"."required_approval_steps"->>3
						AND "hr_timesheet"."required_approval_steps"->>1 <> "hr_timesheet"."required_approval_steps"->>2
						AND "hr_timesheet"."required_approval_steps"->>1 <> "hr_timesheet"."required_approval_steps"->>3
						AND "hr_timesheet"."required_approval_steps"->>2 <> "hr_timesheet"."required_approval_steps"->>3
					)
				)
				AND "hr_timesheet"."completed_approval_steps" >= 0
				AND "hr_timesheet"."completed_approval_steps" <= jsonb_array_length("hr_timesheet"."required_approval_steps")
			)
);
--> statement-breakpoint
CREATE TABLE "hr_timesheet_approval_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"submission_reference" uuid NOT NULL,
	"policy_id" uuid,
	"authority_assignment_id" uuid NOT NULL,
	"step_index" integer NOT NULL,
	"authority" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"comment" text,
	"version_approved" integer NOT NULL,
	"correlation_id" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_approval_decision_step_check" CHECK ("hr_timesheet_approval_decision"."step_index" >= 0),
	CONSTRAINT "hr_timesheet_approval_decision_authority_check" CHECK ("hr_timesheet_approval_decision"."authority" IN ('line_manager', 'department', 'hr', 'payroll'))
);
--> statement-breakpoint
CREATE TABLE "hr_timesheet_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"timesheet_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"timezone" text NOT NULL,
	"source_type" text NOT NULL,
	"source_reference" text,
	"time_type" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"recorded_minutes" integer NOT NULL,
	"approved_minutes" integer NOT NULL,
	"cost_center_id" text,
	"project_id" text,
	"location_id" text,
	"department_id" text,
	"approval_reference" text,
	"evidence_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_timesheet_entry_source_type_check" CHECK ("hr_timesheet_entry"."source_type" IN ('attendance', 'schedule', 'manual', 'leave', 'external')),
	CONSTRAINT "hr_timesheet_entry_time_type_check" CHECK ("hr_timesheet_entry"."time_type" IN ('regular', 'overtime', 'rest_day', 'public_holiday', 'night', 'call_back', 'training', 'travel', 'standby', 'unpaid')),
	CONSTRAINT "hr_timesheet_entry_minutes_check" CHECK ("hr_timesheet_entry"."recorded_minutes" >= 0 AND "hr_timesheet_entry"."approved_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hr_user_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_user_employee_relationship_type_check" CHECK ("hr_user_employee"."relationship_type" IN ('self', 'proxy')),
	CONSTRAINT "hr_user_employee_effective_dates_check" CHECK ("hr_user_employee"."effective_until" IS NULL OR "hr_user_employee"."effective_until" > "hr_user_employee"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_work_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"legal_entity_dimension_id" uuid,
	"legal_entity_key_snapshot" text,
	"legal_entity_name_snapshot" text,
	"business_unit_dimension_id" uuid,
	"business_unit_key_snapshot" text,
	"business_unit_name_snapshot" text,
	"location_dimension_id" uuid,
	"location_key_snapshot" text,
	"location_name_snapshot" text,
	"cost_centre_dimension_id" uuid,
	"cost_centre_key_snapshot" text,
	"cost_centre_name_snapshot" text,
	"project_dimension_id" uuid,
	"project_key_snapshot" text,
	"project_name_snapshot" text,
	"predecessor_assignment_id" uuid,
	"successor_assignment_id" uuid,
	"transfer_movement_id" uuid,
	"manager_employee_id_snapshot" uuid,
	"work_calendar_id_snapshot" uuid,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_assignment_effective_range_ck" CHECK ("hr_work_assignment"."ends_on" IS NULL OR "hr_work_assignment"."starts_on" <= "hr_work_assignment"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "hr_work_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"calendar_version" text NOT NULL,
	"work_week_json" jsonb NOT NULL,
	"standard_hours_per_day" numeric(6, 2) NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_calendar_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_calendar_status_check" CHECK ("hr_work_calendar"."status" IN ('active', 'superseded', 'archived')),
	CONSTRAINT "hr_work_calendar_hours_pos_check" CHECK ("hr_work_calendar"."standard_hours_per_day"::numeric > 0),
	CONSTRAINT "hr_work_calendar_effective_range_check" CHECK ("hr_work_calendar"."effective_to" IS NULL OR "hr_work_calendar"."effective_to" >= "hr_work_calendar"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_work_calendar_holiday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"calendar_id" uuid NOT NULL,
	"holiday_date" date NOT NULL,
	"label" text,
	"location_code" text,
	"jurisdiction" text,
	"override_kind" text DEFAULT 'holiday' NOT NULL,
	"is_working_day" boolean DEFAULT false NOT NULL,
	"expected_minutes" integer,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_calendar_holiday_override_kind_check" CHECK ("hr_work_calendar_holiday"."override_kind" IN ('holiday', 'half_day', 'shortened_day', 'replacement_workday', 'closure')),
	CONSTRAINT "hr_work_calendar_holiday_expected_minutes_pos_check" CHECK ("hr_work_calendar_holiday"."expected_minutes" IS NULL OR "hr_work_calendar_holiday"."expected_minutes" > 0),
	CONSTRAINT "hr_work_calendar_holiday_override_consistency_check" CHECK ((
				("hr_work_calendar_holiday"."override_kind" IN ('holiday', 'closure') AND "hr_work_calendar_holiday"."is_working_day" = false)
				OR (
					"hr_work_calendar_holiday"."override_kind" IN ('half_day', 'shortened_day', 'replacement_workday')
					AND "hr_work_calendar_holiday"."is_working_day" = true
				)
			))
);
--> statement-breakpoint
CREATE TABLE "hr_work_calendar_scope_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"calendar_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_calendar_scope_assignment_scope_type_check" CHECK ("hr_work_calendar_scope_assignment"."scope_type" IN ('employment', 'employee', 'location', 'department', 'legal_entity', 'organization')),
	CONSTRAINT "hr_work_calendar_scope_assignment_effective_range_check" CHECK ("hr_work_calendar_scope_assignment"."effective_to" IS NULL OR "hr_work_calendar_scope_assignment"."effective_to" >= "hr_work_calendar_scope_assignment"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_work_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"jurisdiction" text,
	"status" text NOT NULL,
	"issued_on" date NOT NULL,
	"expires_on" date,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"document_ref" text,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_work_eligibility_status_check" CHECK ("hr_work_eligibility"."status" IN ('pending', 'active', 'suspended', 'expired', 'closed')),
	CONSTRAINT "hr_work_eligibility_expiry_check" CHECK ("hr_work_eligibility"."expires_on" IS NULL OR "hr_work_eligibility"."expires_on" >= "hr_work_eligibility"."issued_on")
);
--> statement-breakpoint
CREATE TABLE "hr_worker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"worker_type" text NOT NULL,
	"employee_id" uuid,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_worker_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "hr_worker_type_check" CHECK ("hr_worker"."worker_type" IN ('employee', 'contractor', 'contingent_worker', 'intern')),
	CONSTRAINT "hr_worker_status_check" CHECK ("hr_worker"."status" IN ('active', 'inactive', 'former')),
	CONSTRAINT "hr_worker_effective_dates_check" CHECK ("hr_worker"."effective_to" IS NULL OR "hr_worker"."effective_to" >= "hr_worker"."effective_from"),
	CONSTRAINT "hr_worker_employee_id_check" CHECK (("hr_worker"."worker_type" = 'employee') OR ("hr_worker"."employee_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "hr_worker_classification_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"worker_type" text NOT NULL,
	"employee_id" uuid,
	"worker_status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_classification_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_worker_classification_version_type_check" CHECK ("hr_worker_classification_version"."worker_type" IN ('employee', 'contractor', 'contingent_worker', 'intern')),
	CONSTRAINT "hr_worker_classification_version_worker_status_check" CHECK ("hr_worker_classification_version"."worker_status" IN ('active', 'inactive', 'former')),
	CONSTRAINT "hr_worker_classification_version_lineage_status_check" CHECK ("hr_worker_classification_version"."lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_worker_classification_version_date_range_check" CHECK ("hr_worker_classification_version"."effective_to" IS NULL OR "hr_worker_classification_version"."effective_to" >= "hr_worker_classification_version"."effective_from"),
	CONSTRAINT "hr_worker_classification_version_employee_id_check" CHECK (("hr_worker_classification_version"."worker_type" = 'employee') OR ("hr_worker_classification_version"."employee_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "stock_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"base_uom_id" uuid,
	"base_uom_code" text,
	"on_hand" numeric(24, 12) DEFAULT '0' NOT NULL,
	"reserved" numeric(24, 12) DEFAULT '0' NOT NULL,
	"available" numeric(24, 12) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"movement_id" uuid NOT NULL,
	"movement_line_id" uuid,
	"movement_code" text NOT NULL,
	"movement_type" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"quantity_delta" numeric(24, 12) NOT NULL,
	"on_hand_after" numeric(24, 12) NOT NULL,
	"reserved_after" numeric(24, 12) NOT NULL,
	"available_after" numeric(24, 12) NOT NULL,
	"ledger_sequence" integer DEFAULT 0 NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"movement_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text NOT NULL,
	"warehouse_id" uuid,
	"warehouse_code" text,
	"warehouse_name" text,
	"from_warehouse_id" uuid,
	"from_warehouse_code" text,
	"from_warehouse_name" text,
	"to_warehouse_id" uuid,
	"to_warehouse_code" text,
	"to_warehouse_name" text,
	"reservation_id" uuid,
	"reverses_movement_id" uuid,
	"adjustment_reason_code" text,
	"adjustment_note" text,
	"source_module" text,
	"source_aggregate_id" text,
	"source_event_id" text,
	"source_event_version" integer,
	"source_line_id" text,
	"create_idempotency_key" text NOT NULL,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"movement_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity" numeric(24, 12) NOT NULL,
	"line_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity" numeric(24, 12) NOT NULL,
	"consumed_quantity" numeric(24, 12) DEFAULT '0' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"release_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"command_kind" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"subject_entity_type" text NOT NULL,
	"subject_entity_id" uuid NOT NULL,
	"submitted_by" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"applied_by" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "md_import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"entity_type" text NOT NULL,
	"source_system" text NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"report" jsonb NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "md_organization_dimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"normalized_key" text NOT NULL,
	"name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "md_org_dimension_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "md_org_dimension_kind_check" CHECK ("md_organization_dimension"."kind" IN ('legal_entity', 'business_unit', 'location', 'cost_centre', 'project')),
	CONSTRAINT "md_org_dimension_effective_range_check" CHECK ("md_organization_dimension"."effective_to" IS NULL OR "md_organization_dimension"."effective_to" >= "md_organization_dimension"."effective_from")
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
CREATE TABLE "md_payment_term" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"net_days" integer NOT NULL,
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
CREATE TABLE "supplier_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_invoice_id" uuid NOT NULL,
	"payment_id" uuid,
	"payment_application_instruction_id" uuid,
	"credit_note_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"amount" text NOT NULL,
	"allocated_at" timestamp with time zone NOT NULL,
	"allocated_by" text NOT NULL,
	"apply_idempotency_key" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_balance_projection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"open_balance" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_credit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_party_code" text NOT NULL,
	"supplier_party_name" text NOT NULL,
	"supplier_invoice_id" uuid,
	"currency_code" text NOT NULL,
	"amount" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_credit_note_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text NOT NULL,
	"line_amount" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_party_code" text NOT NULL,
	"supplier_party_name" text NOT NULL,
	"currency_code" text NOT NULL,
	"purchase_order_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text NOT NULL,
	"line_amount" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "three_way_match_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_invoice_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"goods_receipt_id" uuid,
	"match_status" text NOT NULL,
	"notes" text,
	"evidence_json" text,
	"po_evidence_version" integer,
	"gr_evidence_version" integer,
	"matched_at" timestamp with time zone,
	"matched_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"payment_account_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"counterparty_id" uuid,
	"counterparty_snapshot" text,
	"transfer_group_id" uuid,
	"linked_payment_id" uuid,
	"original_payment_id" uuid,
	"refund_source" text,
	"currency_code" text NOT NULL,
	"amount" text NOT NULL,
	"reference" text,
	"create_idempotency_key" text NOT NULL,
	"post_idempotency_key" text,
	"reverse_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'cash' NOT NULL,
	"currency_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"target_module" text NOT NULL,
	"target_document_type" text NOT NULL,
	"target_document_id" uuid NOT NULL,
	"intended_amount" text NOT NULL,
	"applied_amount" text DEFAULT '0' NOT NULL,
	"currency_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_code" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reversal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reversed_by" text NOT NULL,
	"reversed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_calendar_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_calendar_status_check" CHECK ("payroll_calendar"."status" IN ('active', 'archived')),
	CONSTRAINT "payroll_calendar_effective_range_check" CHECK ("payroll_calendar"."effective_to" IS NULL OR "payroll_calendar"."effective_to" >= "payroll_calendar"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_deduction_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"amount" numeric(24, 12),
	"rate" numeric(24, 12),
	"currency_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"tax_timing" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_deduction_rule_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_deduction_rule_type_check" CHECK ("payroll_deduction_rule"."rule_type" IN ('fixed', 'rate')),
	CONSTRAINT "payroll_deduction_rule_tax_timing_check" CHECK ("payroll_deduction_rule"."tax_timing" IN ('pre_tax', 'post_tax')),
	CONSTRAINT "payroll_deduction_rule_status_check" CHECK ("payroll_deduction_rule"."status" IN ('active', 'superseded', 'archived')),
	CONSTRAINT "payroll_deduction_rule_effective_range_check" CHECK ("payroll_deduction_rule"."effective_to" IS NULL OR "payroll_deduction_rule"."effective_to" >= "payroll_deduction_rule"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_earning_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"amount" numeric(24, 12),
	"rate" numeric(24, 12),
	"currency_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_earning_rule_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_earning_rule_type_check" CHECK ("payroll_earning_rule"."rule_type" IN ('fixed', 'rate')),
	CONSTRAINT "payroll_earning_rule_status_check" CHECK ("payroll_earning_rule"."status" IN ('active', 'superseded', 'archived')),
	CONSTRAINT "payroll_earning_rule_effective_range_check" CHECK ("payroll_earning_rule"."effective_to" IS NULL OR "payroll_earning_rule"."effective_to" >= "payroll_earning_rule"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_employee_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_employee_assignment_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_employee_assignment_status_check" CHECK ("payroll_employee_assignment"."status" IN ('active', 'archived')),
	CONSTRAINT "payroll_employee_assignment_effective_range_check" CHECK ("payroll_employee_assignment"."effective_to" IS NULL OR "payroll_employee_assignment"."effective_to" >= "payroll_employee_assignment"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"severity" text NOT NULL,
	"exception_code" text NOT NULL,
	"message" text NOT NULL,
	"employee_ref" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_exception_severity_check" CHECK ("payroll_exception"."severity" IN ('blocking', 'warning'))
);
--> statement-breakpoint
CREATE TABLE "payroll_pay_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"calendar_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency_code" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_pay_group_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_pay_group_status_check" CHECK ("payroll_pay_group"."status" IN ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "payroll_payslip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"cutoff_date" date NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_period_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_period_status_check" CHECK ("payroll_period"."status" IN ('open', 'closed')),
	CONSTRAINT "payroll_period_range_check" CHECK ("payroll_period"."period_end" >= "payroll_period"."period_start")
);
--> statement-breakpoint
CREATE TABLE "payroll_reconciliation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_recurring_deduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"deduction_rule_id" uuid NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_recurring_deduction_status_check" CHECK ("payroll_recurring_deduction"."status" IN ('active', 'archived')),
	CONSTRAINT "payroll_recurring_deduction_effective_range_check" CHECK ("payroll_recurring_deduction"."effective_to" IS NULL OR "payroll_recurring_deduction"."effective_to" >= "payroll_recurring_deduction"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_recurring_earning" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"earning_rule_id" uuid NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_recurring_earning_status_check" CHECK ("payroll_recurring_earning"."status" IN ('active', 'archived')),
	CONSTRAINT "payroll_recurring_earning_effective_range_check" CHECK ("payroll_recurring_earning"."effective_to" IS NULL OR "payroll_recurring_earning"."effective_to" >= "payroll_recurring_earning"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_result_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"run_employee_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"line_kind" text NOT NULL,
	"code" text NOT NULL,
	"rule_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"rule_kind" text NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"sequence" integer NOT NULL,
	"trace_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_result_line_kind_check" CHECK ("payroll_result_line"."line_kind" IN ('earning', 'pre_tax_deduction', 'employee_statutory', 'post_tax_deduction', 'employer_contribution')),
	CONSTRAINT "payroll_result_line_rule_kind_check" CHECK ("payroll_result_line"."rule_kind" IN ('earning', 'deduction', 'statutory', 'none'))
);
--> statement-breakpoint
CREATE TABLE "payroll_rule_finalized_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"rule_kind" text NOT NULL,
	"rule_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_rule_finalized_usage_kind_check" CHECK ("payroll_rule_finalized_usage"."rule_kind" IN ('earning', 'deduction', 'statutory'))
);
--> statement-breakpoint
CREATE TABLE "payroll_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"run_type" text NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"finalized_at" timestamp with time zone,
	"finalized_by" text,
	"calculation_snapshot_hash" text,
	"calculation_version" text,
	"rounding_policy_json" jsonb,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_run_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_run_type_check" CHECK ("payroll_run"."run_type" IN ('regular', 'off_cycle', 'adjustment')),
	CONSTRAINT "payroll_run_status_check" CHECK ("payroll_run"."status" IN ('draft', 'calculating', 'calculated', 'failed', 'finalized', 'reversed'))
);
--> statement-breakpoint
CREATE TABLE "payroll_run_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"assignment_id" uuid,
	"currency_code" text NOT NULL,
	"gross" numeric(24, 12) NOT NULL,
	"employee_deductions" numeric(24, 12) NOT NULL,
	"employee_statutory" numeric(24, 12) NOT NULL,
	"employer_cost" numeric(24, 12) NOT NULL,
	"net" numeric(24, 12) NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"calculation_version" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_run_employee_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "payroll_run_employee_status_check" CHECK ("payroll_run_employee"."status" IN ('calculated', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "payroll_statutory_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"run_employee_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"rule_code" text NOT NULL,
	"rule_version" text NOT NULL,
	"calculator_id" text NOT NULL,
	"base_amount" numeric(24, 12) NOT NULL,
	"employee_amount" numeric(24, 12) NOT NULL,
	"employer_amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"config_snapshot_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_statutory_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"jurisdiction_code" text NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rule_version" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_statutory_rule_status_check" CHECK ("payroll_statutory_rule"."status" IN ('active', 'superseded', 'archived')),
	CONSTRAINT "payroll_statutory_rule_effective_range_check" CHECK ("payroll_statutory_rule"."effective_to" IS NULL OR "payroll_statutory_rule"."effective_to" >= "payroll_statutory_rule"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "payroll_variable_input" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"earning_rule_id" uuid NOT NULL,
	"earning_rule_code" text NOT NULL,
	"earning_rule_version" text NOT NULL,
	"amount" numeric(24, 12) NOT NULL,
	"currency_code" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"source_request_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_variable_input_status_check" CHECK ("payroll_variable_input"."status" IN ('accepted', 'superseded', 'cancelled')),
	CONSTRAINT "payroll_variable_input_effective_range_check" CHECK ("payroll_variable_input"."effective_to" IS NULL OR "payroll_variable_input"."effective_to" >= "payroll_variable_input"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "platform_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"module" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_domain_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"source_module" text NOT NULL,
	"deduplication_key" text,
	"correlation_id" text NOT NULL,
	"causation_id" text,
	"actor_user_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"priority" text NOT NULL,
	"channel" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"module" text NOT NULL,
	"deduplication_key" text,
	"action_url" text,
	"metadata" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_permission" (
	"code" text PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"description" text NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_rbac_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"role_id" uuid,
	"permission_code" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"correlation_id" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"template_key" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_role_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_role_permission" (
	"role_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" text,
	CONSTRAINT "platform_role_permission_role_id_permission_code_pk" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "platform_search_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"entity" text NOT NULL,
	"document_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"metadata" jsonb,
	"search_vector" "tsvector" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"party_id" uuid NOT NULL,
	"party_code" text NOT NULL,
	"party_name" text NOT NULL,
	"payment_term_id" uuid,
	"payment_term_code" text,
	"payment_term_name" text,
	"net_days" integer,
	"warehouse_id" uuid,
	"warehouse_code" text,
	"warehouse_name" text,
	"currency_code" text NOT NULL,
	"exchange_rate" text,
	"subtotal_amount" text,
	"discount_total" text,
	"tax_total" text,
	"document_total" text,
	"create_idempotency_key" text NOT NULL,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"close_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity" numeric(24, 12) NOT NULL,
	"unit_price" text NOT NULL,
	"discount_amount" text DEFAULT '0' NOT NULL,
	"tax_classification" text,
	"line_amount" text NOT NULL,
	"over_receipt_percent" text DEFAULT '0' NOT NULL,
	"under_receipt_percent" text DEFAULT '0' NOT NULL,
	"invoice_quantity_tolerance_percent" text DEFAULT '0' NOT NULL,
	"invoice_price_tolerance_percent" text DEFAULT '0' NOT NULL,
	"line_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"payment_id" uuid,
	"payment_application_instruction_id" uuid,
	"credit_note_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"amount" text NOT NULL,
	"allocated_at" timestamp with time zone NOT NULL,
	"allocated_by" text NOT NULL,
	"apply_idempotency_key" text,
	"reversed_at" timestamp with time zone,
	"reversed_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_balance_projection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"open_balance" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_credit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"customer_party_code" text NOT NULL,
	"customer_party_name" text NOT NULL,
	"sales_invoice_id" uuid,
	"currency_code" text NOT NULL,
	"amount" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"issue_idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"invoice_source" text DEFAULT 'manual' NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"customer_party_code" text NOT NULL,
	"customer_party_name" text NOT NULL,
	"currency_code" text NOT NULL,
	"sales_order_id" uuid,
	"delivery_id" uuid,
	"invoice_date" timestamp with time zone,
	"accounting_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"payment_term_code" text,
	"payment_term_description" text,
	"manual_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"create_idempotency_key" text,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"close_idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text NOT NULL,
	"line_amount" text NOT NULL,
	"sales_order_line_id" uuid,
	"delivery_line_id" uuid,
	"line_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"notes" text,
	"reverses_receipt_id" uuid,
	"reversed_by_receipt_id" uuid,
	"reverse_reason" text,
	"inventory_application_status" text DEFAULT 'not_applicable' NOT NULL,
	"inventory_movement_id" uuid,
	"inventory_application_error" text,
	"create_idempotency_key" text,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"reverse_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goods_receipt_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity_ordered" text,
	"quantity_expected" text,
	"quantity_received" text NOT NULL,
	"quantity_accepted" text NOT NULL,
	"quantity_rejected" text DEFAULT '0' NOT NULL,
	"quantity_damaged" text DEFAULT '0' NOT NULL,
	"purchase_order_line_id" uuid,
	"line_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiving_discrepancy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goods_receipt_id" uuid NOT NULL,
	"goods_receipt_line_id" uuid,
	"discrepancy_type" text NOT NULL,
	"quantity" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"record_idempotency_key" text,
	"resolve_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"party_id" uuid NOT NULL,
	"party_code" text NOT NULL,
	"party_name" text NOT NULL,
	"bill_to_address_snapshot" text,
	"ship_to_address_snapshot" text,
	"payment_term_id" uuid,
	"payment_term_code" text,
	"payment_term_name" text,
	"net_days" integer,
	"currency_code" text NOT NULL,
	"exchange_rate" text,
	"subtotal_amount" text,
	"discount_total" text,
	"tax_total" text,
	"document_total" text,
	"create_idempotency_key" text NOT NULL,
	"post_idempotency_key" text,
	"cancel_idempotency_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity" numeric(24, 12) NOT NULL,
	"unit_price" text NOT NULL,
	"discount_amount" text DEFAULT '0' NOT NULL,
	"tax_classification" text,
	"line_amount" text NOT NULL,
	"line_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_role_mapping" ADD CONSTRAINT "account_role_mapping_ledger_account_id_ledger_account_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_period_id_accounting_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."accounting_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_journal_id_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_ledger_account_id_ledger_account_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_chart_of_account_id_chart_of_account_id_fk" FOREIGN KEY ("chart_of_account_id") REFERENCES "public"."chart_of_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_journal_id_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_journal_line_id_journal_line_id_fk" FOREIGN KEY ("journal_line_id") REFERENCES "public"."journal_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_ledger_account_id_ledger_account_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_posting" ADD CONSTRAINT "ledger_posting_period_id_accounting_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."accounting_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_profile_line" ADD CONSTRAINT "posting_profile_line_posting_profile_id_posting_profile_id_fk" FOREIGN KEY ("posting_profile_id") REFERENCES "public"."posting_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_posting_link" ADD CONSTRAINT "source_posting_link_journal_id_journal_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_line" ADD CONSTRAINT "delivery_line_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_line" ADD CONSTRAINT "delivery_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_pack" ADD CONSTRAINT "delivery_pack_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_pick" ADD CONSTRAINT "delivery_pick_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_pick" ADD CONSTRAINT "delivery_pick_delivery_line_id_delivery_line_id_fk" FOREIGN KEY ("delivery_line_id") REFERENCES "public"."delivery_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_of_delivery" ADD CONSTRAINT "proof_of_delivery_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_adjustment" ADD CONSTRAINT "hr_attendance_adjustment_event_id_hr_attendance_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."hr_attendance_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision" ADD CONSTRAINT "hr_attendance_break_waiver_decision_session_id_hr_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_attendance_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision" ADD CONSTRAINT "hr_attendance_break_waiver_decision_policy_id_hr_time_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_break_waiver_decision" ADD CONSTRAINT "hr_attendance_break_waiver_decision_authority_assignment_id_hr_time_approval_authority_assignment_id_fk" FOREIGN KEY ("authority_assignment_id") REFERENCES "public"."hr_time_approval_authority_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ADD CONSTRAINT "hr_attendance_event_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_session_id_hr_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_attendance_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_event_id_hr_attendance_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."hr_attendance_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_exception" ADD CONSTRAINT "hr_attendance_exception_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_import_error" ADD CONSTRAINT "hr_attendance_import_error_import_batch_id_hr_attendance_import_batch_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."hr_attendance_import_batch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance_session" ADD CONSTRAINT "hr_attendance_session_shift_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("shift_assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_eligibility" ADD CONSTRAINT "hr_benefit_eligibility_plan_id_hr_benefit_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_benefit_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_plan_id_hr_benefit_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_benefit_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment_dependent" ADD CONSTRAINT "hr_benefit_enrollment_dependent_enrollment_id_hr_benefit_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."hr_benefit_enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_candidate_id_hr_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hr_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_candidate_id_hr_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hr_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application_status_history" ADD CONSTRAINT "hr_candidate_application_status_history_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan" ADD CONSTRAINT "hr_career_plan_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan_action" ADD CONSTRAINT "hr_career_plan_action_career_plan_id_hr_career_plan_id_fk" FOREIGN KEY ("career_plan_id") REFERENCES "public"."hr_career_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan_action" ADD CONSTRAINT "hr_career_plan_action_learning_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("learning_assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade_progression_rule" ADD CONSTRAINT "hr_compensation_grade_progression_rule_from_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("from_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_grade_progression_rule" ADD CONSTRAINT "hr_compensation_grade_progression_rule_to_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("to_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_proposed_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("proposed_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_proposal" ADD CONSTRAINT "hr_compensation_proposal_proposed_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("proposed_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_cycle_id_hr_compensation_review_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_compensation_review_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_proposed_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("proposed_grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_proposed_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("proposed_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_compensation_review" ADD CONSTRAINT "hr_compensation_review_applied_compensation_id_hr_employee_compensation_id_fk" FOREIGN KEY ("applied_compensation_id") REFERENCES "public"."hr_employee_compensation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_competency_id_hr_competency_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."hr_competency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_supersedes_assessment_id_hr_competency_assessment_id_fk" FOREIGN KEY ("supersedes_assessment_id") REFERENCES "public"."hr_competency_assessment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_competency_assessment" ADD CONSTRAINT "hr_competency_assessment_superseded_by_assessment_id_hr_competency_assessment_id_fk" FOREIGN KEY ("superseded_by_assessment_id") REFERENCES "public"."hr_competency_assessment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_department" ADD CONSTRAINT "hr_department_parent_department_id_hr_department_id_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_department_structure_version" ADD CONSTRAINT "hr_department_structure_version_supersedes_structure_version_id_hr_department_structure_version_id_fk" FOREIGN KEY ("supersedes_structure_version_id") REFERENCES "public"."hr_department_structure_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_department_structure_version" ADD CONSTRAINT "hr_department_structure_version_org_department_fk" FOREIGN KEY ("organization_id","department_id") REFERENCES "public"."hr_department"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case" ADD CONSTRAINT "hr_employee_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case" ADD CONSTRAINT "hr_employee_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_action" ADD CONSTRAINT "hr_employee_case_action_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_appeal" ADD CONSTRAINT "hr_employee_case_appeal_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_event" ADD CONSTRAINT "hr_employee_case_event_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_completion_id_hr_learning_completion_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."hr_learning_completion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_renewed_from_certification_id_hr_employee_certification_id_fk" FOREIGN KEY ("renewed_from_certification_id") REFERENCES "public"."hr_employee_certification"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_document" ADD CONSTRAINT "hr_employee_document_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_document" ADD CONSTRAINT "hr_employee_document_requirement_id_hr_document_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."hr_document_requirement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_calendar_assignment" ADD CONSTRAINT "hr_employment_calendar_assignment_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_supersedes_contract_id_hr_employment_contract_id_fk" FOREIGN KEY ("supersedes_contract_id") REFERENCES "public"."hr_employment_contract"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_superseded_by_contract_id_hr_employment_contract_id_fk" FOREIGN KEY ("superseded_by_contract_id") REFERENCES "public"."hr_employment_contract"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("from_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("to_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_position_id_hr_position_id_fk" FOREIGN KEY ("from_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_position_id_hr_position_id_fk" FOREIGN KEY ("to_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_compensation_proposal_id_hr_compensation_proposal_id_fk" FOREIGN KEY ("compensation_proposal_id") REFERENCES "public"."hr_compensation_proposal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_status_history" ADD CONSTRAINT "hr_employment_status_history_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD CONSTRAINT "hr_exit_interview_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_exit_interview" ADD CONSTRAINT "hr_exit_interview_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_plan" ADD CONSTRAINT "hr_headcount_plan_supersedes_plan_id_hr_headcount_plan_id_fk" FOREIGN KEY ("supersedes_plan_id") REFERENCES "public"."hr_headcount_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_plan_line" ADD CONSTRAINT "hr_headcount_plan_line_plan_id_hr_headcount_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_headcount_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_plan_line" ADD CONSTRAINT "hr_headcount_plan_line_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_plan_line" ADD CONSTRAINT "hr_headcount_plan_line_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_plan_line" ADD CONSTRAINT "hr_headcount_plan_line_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_reservation" ADD CONSTRAINT "hr_headcount_reservation_plan_id_hr_headcount_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_headcount_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_reservation" ADD CONSTRAINT "hr_headcount_reservation_plan_line_id_hr_headcount_plan_line_id_fk" FOREIGN KEY ("plan_line_id") REFERENCES "public"."hr_headcount_plan_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_headcount_reservation" ADD CONSTRAINT "hr_headcount_reservation_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_offer_id_hr_employment_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."hr_employment_offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_person_id_hr_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."hr_person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_worker_id_hr_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."hr_worker"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_hire_attempt" ADD CONSTRAINT "hr_hire_attempt_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interview" ADD CONSTRAINT "hr_interview_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD CONSTRAINT "hr_interview_evaluation_interview_id_hr_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."hr_interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_competency" ADD CONSTRAINT "hr_job_competency_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_competency" ADD CONSTRAINT "hr_job_competency_competency_id_hr_competency_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."hr_competency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_definition_version" ADD CONSTRAINT "hr_job_definition_version_supersedes_definition_version_id_hr_job_definition_version_id_fk" FOREIGN KEY ("supersedes_definition_version_id") REFERENCES "public"."hr_job_definition_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_definition_version" ADD CONSTRAINT "hr_job_definition_version_org_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."hr_job"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_hiring_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("hiring_manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_attendance" ADD CONSTRAINT "hr_learning_attendance_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_completion" ADD CONSTRAINT "hr_learning_completion_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_session" ADD CONSTRAINT "hr_learning_session_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_adjustment" ADD CONSTRAINT "hr_leave_adjustment_entitlement_id_hr_leave_entitlement_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."hr_leave_entitlement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_adjustment" ADD CONSTRAINT "hr_leave_adjustment_source_request_id_hr_leave_request_id_fk" FOREIGN KEY ("source_request_id") REFERENCES "public"."hr_leave_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_approval_decision" ADD CONSTRAINT "hr_leave_approval_decision_request_id_hr_leave_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hr_leave_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_entitlement" ADD CONSTRAINT "hr_leave_entitlement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_entitlement" ADD CONSTRAINT "hr_leave_entitlement_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_entitlement" ADD CONSTRAINT "hr_leave_entitlement_policy_id_hr_leave_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_leave_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_supersedes_policy_id_hr_leave_policy_id_fk" FOREIGN KEY ("supersedes_policy_id") REFERENCES "public"."hr_leave_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_policy_eligibility" ADD CONSTRAINT "hr_leave_policy_eligibility_policy_id_hr_leave_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_leave_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_request" ADD CONSTRAINT "hr_leave_request_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_request" ADD CONSTRAINT "hr_leave_request_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_request" ADD CONSTRAINT "hr_leave_request_entitlement_id_hr_leave_entitlement_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."hr_leave_entitlement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_request" ADD CONSTRAINT "hr_leave_request_policy_id_hr_leave_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_leave_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_request_segment" ADD CONSTRAINT "hr_leave_request_segment_request_id_hr_leave_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hr_leave_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_access_revocation" ADD CONSTRAINT "hr_offboarding_access_revocation_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_access_revocation" ADD CONSTRAINT "hr_offboarding_access_revocation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_termination_id_hr_termination_id_fk" FOREIGN KEY ("termination_id") REFERENCES "public"."hr_termination"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_payroll_handoff" ADD CONSTRAINT "hr_offboarding_payroll_handoff_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_payroll_handoff" ADD CONSTRAINT "hr_offboarding_payroll_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD CONSTRAINT "hr_offboarding_task_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_access_handoff" ADD CONSTRAINT "hr_onboarding_access_handoff_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_access_handoff" ADD CONSTRAINT "hr_onboarding_access_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_source_offer_id_hr_employment_offer_id_fk" FOREIGN KEY ("source_offer_id") REFERENCES "public"."hr_employment_offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_equipment_handoff" ADD CONSTRAINT "hr_onboarding_equipment_handoff_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_equipment_handoff" ADD CONSTRAINT "hr_onboarding_equipment_handoff_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_orientation" ADD CONSTRAINT "hr_onboarding_orientation_onboarding_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("onboarding_case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_orientation" ADD CONSTRAINT "hr_onboarding_orientation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD CONSTRAINT "hr_onboarding_task_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_overtime_approval" ADD CONSTRAINT "hr_overtime_approval_overtime_request_id_hr_overtime_request_id_fk" FOREIGN KEY ("overtime_request_id") REFERENCES "public"."hr_overtime_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_overtime_request" ADD CONSTRAINT "hr_overtime_request_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_overtime_request" ADD CONSTRAINT "hr_overtime_request_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_participant_id_hr_performance_review_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."hr_performance_review_participant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_eligibility" ADD CONSTRAINT "hr_performance_cycle_eligibility_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_review_period" ADD CONSTRAINT "hr_performance_cycle_review_period_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_aligned_to_goal_id_hr_performance_goal_id_fk" FOREIGN KEY ("aligned_to_goal_id") REFERENCES "public"."hr_performance_goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal_progress" ADD CONSTRAINT "hr_performance_goal_progress_goal_id_hr_performance_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."hr_performance_goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_checkpoint" ADD CONSTRAINT "hr_performance_improvement_checkpoint_plan_id_hr_performance_improvement_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_performance_improvement_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_improvement_plan" ADD CONSTRAINT "hr_performance_improvement_plan_accountable_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("accountable_manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_review" ADD CONSTRAINT "hr_performance_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD CONSTRAINT "hr_performance_review_participant_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_review_participant" ADD CONSTRAINT "hr_performance_review_participant_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_person_contact" ADD CONSTRAINT "hr_person_contact_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_person_identifier" ADD CONSTRAINT "hr_person_identifier_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_person_identity_version" ADD CONSTRAINT "hr_person_identity_version_supersedes_identity_version_id_hr_person_identity_version_id_fk" FOREIGN KEY ("supersedes_identity_version_id") REFERENCES "public"."hr_person_identity_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_person_identity_version" ADD CONSTRAINT "hr_person_identity_version_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgement" ADD CONSTRAINT "hr_policy_acknowledgement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgement" ADD CONSTRAINT "hr_policy_acknowledgement_supersedes_acknowledgement_id_hr_policy_acknowledgement_id_fk" FOREIGN KEY ("supersedes_acknowledgement_id") REFERENCES "public"."hr_policy_acknowledgement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position_definition_version" ADD CONSTRAINT "hr_position_definition_version_supersedes_definition_version_id_hr_position_definition_version_id_fk" FOREIGN KEY ("supersedes_definition_version_id") REFERENCES "public"."hr_position_definition_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position_definition_version" ADD CONSTRAINT "hr_position_definition_version_org_position_fk" FOREIGN KEY ("organization_id","position_id") REFERENCES "public"."hr_position"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_probation_review_id_hr_probation_review_id_fk" FOREIGN KEY ("probation_review_id") REFERENCES "public"."hr_probation_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_assessment" ADD CONSTRAINT "hr_probation_assessment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_supersedes_reporting_line_id_hr_reporting_line_id_fk" FOREIGN KEY ("supersedes_reporting_line_id") REFERENCES "public"."hr_reporting_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_superseded_by_reporting_line_id_hr_reporting_line_id_fk" FOREIGN KEY ("superseded_by_reporting_line_id") REFERENCES "public"."hr_reporting_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_supersedes_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("supersedes_salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift" ADD CONSTRAINT "hr_shift_supersedes_shift_id_hr_shift_id_fk" FOREIGN KEY ("supersedes_shift_id") REFERENCES "public"."hr_shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignment" ADD CONSTRAINT "hr_shift_assignment_shift_id_hr_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hr_shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_assignment_segment" ADD CONSTRAINT "hr_shift_assignment_segment_assignment_id_hr_shift_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hr_shift_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_shift_break" ADD CONSTRAINT "hr_shift_break_shift_id_hr_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hr_shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_candidate" ADD CONSTRAINT "hr_succession_candidate_succession_plan_id_hr_succession_plan_id_fk" FOREIGN KEY ("succession_plan_id") REFERENCES "public"."hr_succession_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_candidate" ADD CONSTRAINT "hr_succession_candidate_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_plan" ADD CONSTRAINT "hr_succession_plan_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_critical_role_readiness" ADD CONSTRAINT "hr_talent_critical_role_readiness_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_critical_role_readiness" ADD CONSTRAINT "hr_talent_critical_role_readiness_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_pool_member" ADD CONSTRAINT "hr_talent_pool_member_pool_id_hr_talent_pool_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."hr_talent_pool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_pool_member" ADD CONSTRAINT "hr_talent_pool_member_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_profile" ADD CONSTRAINT "hr_talent_profile_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_profile_assessment" ADD CONSTRAINT "hr_talent_profile_assessment_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_profile_mobility" ADD CONSTRAINT "hr_talent_profile_mobility_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_time_policy" ADD CONSTRAINT "hr_time_policy_supersedes_policy_id_hr_time_policy_id_fk" FOREIGN KEY ("supersedes_policy_id") REFERENCES "public"."hr_time_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_time_policy_assignment" ADD CONSTRAINT "hr_time_policy_assignment_policy_id_hr_time_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_time_policy_assignment" ADD CONSTRAINT "hr_time_policy_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_approval_policy_id_hr_time_policy_id_fk" FOREIGN KEY ("approval_policy_id") REFERENCES "public"."hr_time_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet" ADD CONSTRAINT "hr_timesheet_supersedes_timesheet_id_hr_timesheet_id_fk" FOREIGN KEY ("supersedes_timesheet_id") REFERENCES "public"."hr_timesheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision" ADD CONSTRAINT "hr_timesheet_approval_decision_timesheet_id_hr_timesheet_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."hr_timesheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision" ADD CONSTRAINT "hr_timesheet_approval_decision_policy_id_hr_time_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."hr_time_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet_approval_decision" ADD CONSTRAINT "hr_timesheet_approval_decision_authority_assignment_id_hr_time_approval_authority_assignment_id_fk" FOREIGN KEY ("authority_assignment_id") REFERENCES "public"."hr_time_approval_authority_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet_entry" ADD CONSTRAINT "hr_timesheet_entry_timesheet_id_hr_timesheet_id_fk" FOREIGN KEY ("timesheet_id") REFERENCES "public"."hr_timesheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_timesheet_entry" ADD CONSTRAINT "hr_timesheet_entry_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_user_employee" ADD CONSTRAINT "hr_user_employee_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_predecessor_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("predecessor_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_successor_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("successor_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_transfer_movement_id_hr_employment_movement_id_fk" FOREIGN KEY ("transfer_movement_id") REFERENCES "public"."hr_employment_movement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_manager_employee_id_snapshot_hr_employee_id_fk" FOREIGN KEY ("manager_employee_id_snapshot") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_work_calendar_id_snapshot_hr_work_calendar_id_fk" FOREIGN KEY ("work_calendar_id_snapshot") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_legal_entity_dimension_fk" FOREIGN KEY ("organization_id","legal_entity_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_business_unit_dimension_fk" FOREIGN KEY ("organization_id","business_unit_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_location_dimension_fk" FOREIGN KEY ("organization_id","location_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_cost_centre_dimension_fk" FOREIGN KEY ("organization_id","cost_centre_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_project_dimension_fk" FOREIGN KEY ("organization_id","project_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_calendar" ADD CONSTRAINT "hr_work_calendar_supersedes_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("supersedes_calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_calendar_holiday" ADD CONSTRAINT "hr_work_calendar_holiday_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_calendar_scope_assignment" ADD CONSTRAINT "hr_work_calendar_scope_assignment_calendar_id_hr_work_calendar_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."hr_work_calendar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_eligibility" ADD CONSTRAINT "hr_work_eligibility_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_worker" ADD CONSTRAINT "hr_worker_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_worker" ADD CONSTRAINT "hr_worker_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."hr_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_supersedes_classification_version_id_hr_worker_classification_version_id_fk" FOREIGN KEY ("supersedes_classification_version_id") REFERENCES "public"."hr_worker_classification_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_org_worker_fk" FOREIGN KEY ("organization_id","worker_id") REFERENCES "public"."hr_worker"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."hr_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_movement_id_stock_movement_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_movement_line_id_stock_movement_line_id_fk" FOREIGN KEY ("movement_line_id") REFERENCES "public"."stock_movement_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_from_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_to_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_reverses_movement_id_stock_movement_id_fk" FOREIGN KEY ("reverses_movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_line" ADD CONSTRAINT "stock_movement_line_movement_id_stock_movement_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_line" ADD CONSTRAINT "stock_movement_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_base_uom_id_ref_uom_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_item_group_id_md_item_group_id_fk" FOREIGN KEY ("item_group_id") REFERENCES "public"."md_item_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_alias" ADD CONSTRAINT "md_item_alias_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_barcode" ADD CONSTRAINT "md_item_barcode_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_external_id" ADD CONSTRAINT "md_item_external_id_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute" ADD CONSTRAINT "md_item_template_attribute_template_id_md_item_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."md_item_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_template_attribute_option" ADD CONSTRAINT "md_item_template_attribute_option_attribute_id_md_item_template_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."md_item_template_attribute"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_uom" ADD CONSTRAINT "md_item_uom_uom_id_ref_uom_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."ref_uom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_variant" ADD CONSTRAINT "md_item_variant_template_id_md_item_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."md_item_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_variant_id_md_item_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."md_item_variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_attribute_id_md_item_template_attribute_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."md_item_template_attribute"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_item_variant_attribute_value" ADD CONSTRAINT "md_item_variant_attribute_value_option_id_md_item_template_attribute_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."md_item_template_attribute_option"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_org_supersedes_fk" FOREIGN KEY ("organization_id","supersedes_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_registration_country_id_ref_country_id_fk" FOREIGN KEY ("registration_country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_preferred_language_id_ref_language_id_fk" FOREIGN KEY ("preferred_language_id") REFERENCES "public"."ref_language"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party" ADD CONSTRAINT "md_party_default_currency_id_ref_currency_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."ref_currency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_country_id_ref_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_from_party_id_md_party_id_fk" FOREIGN KEY ("from_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_to_party_id_md_party_id_fk" FOREIGN KEY ("to_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_tax_registration" ADD CONSTRAINT "md_tax_registration_jurisdiction_country_id_ref_country_id_fk" FOREIGN KEY ("jurisdiction_country_id") REFERENCES "public"."ref_country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" ADD CONSTRAINT "md_warehouse_external_id_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref_uom" ADD CONSTRAINT "ref_uom_dimension_id_ref_uom_dimension_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."ref_uom_dimension"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_credit_note_id_supplier_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."supplier_credit_note"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_balance_projection" ADD CONSTRAINT "supplier_balance_projection_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_credit_note" ADD CONSTRAINT "supplier_credit_note_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_credit_note" ADD CONSTRAINT "supplier_credit_note_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_credit_note_line" ADD CONSTRAINT "supplier_credit_note_line_credit_note_id_supplier_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."supplier_credit_note"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_credit_note_line" ADD CONSTRAINT "supplier_credit_note_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice" ADD CONSTRAINT "supplier_invoice_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice" ADD CONSTRAINT "supplier_invoice_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice_line" ADD CONSTRAINT "supplier_invoice_line_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice_line" ADD CONSTRAINT "supplier_invoice_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_account_id_payment_account_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."payment_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocation" ADD CONSTRAINT "payment_allocation_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reversal" ADD CONSTRAINT "payment_reversal_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD CONSTRAINT "payroll_earning_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD CONSTRAINT "payroll_employee_assignment_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD CONSTRAINT "payroll_exception_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD CONSTRAINT "payroll_pay_group_org_calendar_fk" FOREIGN KEY ("organization_id","calendar_id") REFERENCES "public"."payroll_calendar"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_assignment_fk" FOREIGN KEY ("organization_id","assignment_id") REFERENCES "public"."payroll_employee_assignment"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_deduction_rule_fk" FOREIGN KEY ("organization_id","deduction_rule_id") REFERENCES "public"."payroll_deduction_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_assignment_fk" FOREIGN KEY ("organization_id","assignment_id") REFERENCES "public"."payroll_employee_assignment"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_earning_rule_fk" FOREIGN KEY ("organization_id","earning_rule_id") REFERENCES "public"."payroll_earning_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_result_line" ADD CONSTRAINT "payroll_result_line_org_run_employee_fk" FOREIGN KEY ("organization_id","run_employee_id") REFERENCES "public"."payroll_run_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_rule_finalized_usage" ADD CONSTRAINT "payroll_rule_finalized_usage_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_org_period_fk" FOREIGN KEY ("organization_id","period_id") REFERENCES "public"."payroll_period"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_run_employee" ADD CONSTRAINT "payroll_run_employee_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD CONSTRAINT "payroll_statutory_result_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_statutory_result" ADD CONSTRAINT "payroll_statutory_result_org_run_employee_fk" FOREIGN KEY ("organization_id","run_employee_id") REFERENCES "public"."payroll_run_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD CONSTRAINT "payroll_statutory_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_period_fk" FOREIGN KEY ("organization_id","period_id") REFERENCES "public"."payroll_period"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_earning_rule_fk" FOREIGN KEY ("organization_id","earning_rule_id") REFERENCES "public"."payroll_earning_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_payment_term_id_md_payment_term_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."md_payment_term"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_order_id_purchase_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_sales_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_credit_note_id_sales_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."sales_credit_note"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_balance_projection" ADD CONSTRAINT "customer_balance_projection_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_credit_note" ADD CONSTRAINT "sales_credit_note_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_credit_note" ADD CONSTRAINT "sales_credit_note_sales_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_sales_order_id_sales_order_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_line" ADD CONSTRAINT "sales_invoice_line_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_line" ADD CONSTRAINT "sales_invoice_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt" ADD CONSTRAINT "goods_receipt_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_discrepancy" ADD CONSTRAINT "receiving_discrepancy_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_discrepancy" ADD CONSTRAINT "receiving_discrepancy_goods_receipt_line_id_goods_receipt_line_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_payment_term_id_md_payment_term_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."md_payment_term"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_role_mapping_org_role_uidx" ON "account_role_mapping" USING btree ("organization_id","account_role");--> statement-breakpoint
CREATE INDEX "account_role_mapping_org_id_idx" ON "account_role_mapping" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "accounting_period_org_id_idx" ON "accounting_period" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "accounting_period_org_status_idx" ON "accounting_period" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_period_org_code_uidx" ON "accounting_period" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "chart_of_account_org_code_uidx" ON "chart_of_account" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "chart_of_account_org_id_idx" ON "chart_of_account" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "financial_posting_exception_org_id_idx" ON "financial_posting_exception" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "financial_posting_exception_org_status_idx" ON "financial_posting_exception" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "journal_org_id_idx" ON "journal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "journal_org_status_idx" ON "journal" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "journal_org_period_idx" ON "journal" USING btree ("organization_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_org_normalized_code_uidx" ON "journal" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "journal_line_org_id_idx" ON "journal_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "journal_line_org_journal_idx" ON "journal_line" USING btree ("organization_id","journal_id");--> statement-breakpoint
CREATE INDEX "journal_line_org_account_idx" ON "journal_line" USING btree ("organization_id","account_code");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_line_org_journal_line_no_uidx" ON "journal_line" USING btree ("organization_id","journal_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_account_org_normalized_code_uidx" ON "ledger_account" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "ledger_account_org_id_idx" ON "ledger_account" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "ledger_account_org_coa_idx" ON "ledger_account" USING btree ("organization_id","chart_of_account_id");--> statement-breakpoint
CREATE INDEX "ledger_posting_org_id_idx" ON "ledger_posting" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "ledger_posting_org_journal_idx" ON "ledger_posting" USING btree ("organization_id","journal_id");--> statement-breakpoint
CREATE INDEX "ledger_posting_org_line_idx" ON "ledger_posting" USING btree ("organization_id","journal_line_id");--> statement-breakpoint
CREATE INDEX "ledger_posting_org_account_idx" ON "ledger_posting" USING btree ("organization_id","account_code");--> statement-breakpoint
CREATE INDEX "ledger_posting_org_period_idx" ON "ledger_posting" USING btree ("organization_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posting_profile_org_code_ver_uidx" ON "posting_profile" USING btree ("organization_id","code","version_number");--> statement-breakpoint
CREATE INDEX "posting_profile_org_id_idx" ON "posting_profile" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "posting_profile_line_org_profile_line_uidx" ON "posting_profile_line" USING btree ("organization_id","posting_profile_id","line_no");--> statement-breakpoint
CREATE INDEX "posting_profile_line_org_id_idx" ON "posting_profile_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_posting_link_idempotency_uidx" ON "source_posting_link" USING btree ("organization_id","source_module","source_aggregate_id","source_event_id","source_event_version","posting_rule_version");--> statement-breakpoint
CREATE INDEX "source_posting_link_org_id_idx" ON "source_posting_link" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "source_posting_link_org_journal_idx" ON "source_posting_link" USING btree ("organization_id","journal_id");--> statement-breakpoint
CREATE INDEX "ca_company_activity_company_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_activity_as_of_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","activity_type","classification_system","jurisdiction_code","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_activity_known_at_idx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_activity_org_company_id_uidx" ON "ca_company_activity" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_company_financial_year_company_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_financial_year_effective_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_financial_year_known_at_idx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_financial_year_org_company_id_uidx" ON "ca_company_financial_year" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_company_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_scope_effective_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","identifier_type","jurisdiction_code","authority_code","normalized_value","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_known_at_idx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","identifier_type","jurisdiction_code","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_recorded_at_idx" ON "ca_company_identifier" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_supersedes_idx" ON "ca_company_identifier" USING btree ("supersedes_id");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_type_authority_idx" ON "ca_company_identifier" USING btree ("identifier_type","jurisdiction_code","authority_code");--> statement-breakpoint
CREATE INDEX "ca_company_identifier_normalized_value_idx" ON "ca_company_identifier" USING btree ("normalized_value");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_identifier_org_company_id_uidx" ON "ca_company_identifier" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_company_jurisdiction_profile_company_idx" ON "ca_company_jurisdiction_profile" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_jurisdiction_profile_effective_idx" ON "ca_company_jurisdiction_profile" USING btree ("organization_id","legal_company_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_jurisdiction_profile_recorded_idx" ON "ca_company_jurisdiction_profile" USING btree ("organization_id","recorded_at");--> statement-breakpoint
CREATE INDEX "ca_company_jurisdiction_profile_known_at_idx" ON "ca_company_jurisdiction_profile" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_jurisdiction_profile_org_company_id_uidx" ON "ca_company_jurisdiction_profile" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_company_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_effective_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_effective_from_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_jurisdiction_form_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","jurisdiction_code","legal_form_code");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_recorded_at_idx" ON "ca_company_legal_form_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_supersedes_idx" ON "ca_company_legal_form_history" USING btree ("supersedes_id");--> statement-breakpoint
CREATE INDEX "ca_company_legal_form_known_at_idx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_legal_form_org_company_id_uidx" ON "ca_company_legal_form_history" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE INDEX "ca_company_name_company_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id");--> statement-breakpoint
CREATE INDEX "ca_company_name_scope_effective_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ca_company_name_scope_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code");--> statement-breakpoint
CREATE INDEX "ca_company_name_effective_from_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","effective_from");--> statement-breakpoint
CREATE INDEX "ca_company_name_normalized_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","normalized_name");--> statement-breakpoint
CREATE INDEX "ca_company_name_normalized_name_idx" ON "ca_company_name" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "ca_company_name_recorded_at_idx" ON "ca_company_name" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "ca_company_name_supersedes_idx" ON "ca_company_name" USING btree ("supersedes_id");--> statement-breakpoint
CREATE INDEX "ca_company_name_known_at_idx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","name_type","language_code","effective_from","effective_to","recorded_from","recorded_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_company_name_org_company_id_uidx" ON "ca_company_name" USING btree ("organization_id","legal_company_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_legal_company_org_code_uidx" ON "ca_legal_company" USING btree ("organization_id","normalized_company_code");--> statement-breakpoint
CREATE INDEX "ca_legal_company_org_state_idx" ON "ca_legal_company" USING btree ("organization_id","state");--> statement-breakpoint
CREATE INDEX "ca_legal_company_org_party_idx" ON "ca_legal_company" USING btree ("organization_id","master_data_party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ca_mutation_receipt_scope_uidx" ON "ca_mutation_receipt" USING btree ("organization_id","command_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ca_mutation_receipt_org_status_idx" ON "ca_mutation_receipt" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "ca_mutation_receipt_org_updated_idx" ON "ca_mutation_receipt" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "delivery_org_id_idx" ON "delivery" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "delivery_org_status_idx" ON "delivery" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "delivery_org_sales_order_idx" ON "delivery" USING btree ("organization_id","sales_order_id");--> statement-breakpoint
CREATE INDEX "delivery_org_warehouse_idx" ON "delivery" USING btree ("organization_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_org_normalized_code_uidx" ON "delivery" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "delivery_line_org_id_idx" ON "delivery_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "delivery_line_org_delivery_idx" ON "delivery_line" USING btree ("organization_id","delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_line_org_item_idx" ON "delivery_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_line_org_delivery_line_no_uidx" ON "delivery_line" USING btree ("organization_id","delivery_id","line_no");--> statement-breakpoint
CREATE INDEX "delivery_pack_org_delivery_idx" ON "delivery_pack" USING btree ("organization_id","delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_pick_org_delivery_idx" ON "delivery_pick" USING btree ("organization_id","delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proof_of_delivery_org_delivery_uidx" ON "proof_of_delivery" USING btree ("organization_id","delivery_id");--> statement-breakpoint
CREATE INDEX "hr_allowance_entitlement_org_id_idx" ON "hr_allowance_entitlement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_adjustment_org_id_idx" ON "hr_attendance_adjustment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_adjustment_org_event_idx" ON "hr_attendance_adjustment" USING btree ("organization_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_adjustment_org_event_sequence_uq" ON "hr_attendance_adjustment" USING btree ("organization_id","event_id","sequence") WHERE "hr_attendance_adjustment"."sequence" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_attendance_break_waiver_decision_org_id_idx" ON "hr_attendance_break_waiver_decision" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_break_waiver_decision_org_session_idx" ON "hr_attendance_break_waiver_decision" USING btree ("organization_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_break_waiver_decision_org_session_version_uidx" ON "hr_attendance_break_waiver_decision" USING btree ("organization_id","session_id","session_version");--> statement-breakpoint
CREATE INDEX "hr_attendance_event_org_id_idx" ON "hr_attendance_event" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_event_org_employee_date_idx" ON "hr_attendance_event" USING btree ("organization_id","employee_id","local_work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_event_org_create_idempotency_uidx" ON "hr_attendance_event" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_event_org_source_ref_uidx" ON "hr_attendance_event" USING btree ("organization_id","source","source_reference") WHERE "hr_attendance_event"."source_reference" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_attendance_exception_org_id_idx" ON "hr_attendance_exception" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_exception_org_employee_idx" ON "hr_attendance_exception" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_attendance_exception_org_status_idx" ON "hr_attendance_exception" USING btree ("organization_id","review_status");--> statement-breakpoint
CREATE INDEX "hr_attendance_import_batch_org_id_idx" ON "hr_attendance_import_batch" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_import_batch_org_batch_idx" ON "hr_attendance_import_batch" USING btree ("organization_id","batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_import_batch_org_create_idempotency_uidx" ON "hr_attendance_import_batch" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_attendance_import_error_org_batch_idx" ON "hr_attendance_import_error" USING btree ("organization_id","import_batch_id");--> statement-breakpoint
CREATE INDEX "hr_attendance_session_org_id_idx" ON "hr_attendance_session" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_attendance_session_org_employee_date_idx" ON "hr_attendance_session" USING btree ("organization_id","employee_id","local_work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_attendance_session_org_create_idempotency_uidx" ON "hr_attendance_session" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_benefit_eligibility_org_id_idx" ON "hr_benefit_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_eligibility_org_plan_idx" ON "hr_benefit_eligibility" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_eligibility_org_plan_uidx" ON "hr_benefit_eligibility" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_id_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_employee_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_plan_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_employee_plan_open_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id","plan_id") WHERE "hr_benefit_enrollment"."status" IN ('active', 'waived');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_create_idempotency_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_dependent_org_id_idx" ON "hr_benefit_enrollment_dependent" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_dependent_org_enrollment_idx" ON "hr_benefit_enrollment_dependent" USING btree ("organization_id","enrollment_id");--> statement-breakpoint
CREATE INDEX "hr_benefit_plan_org_id_idx" ON "hr_benefit_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_plan_org_status_idx" ON "hr_benefit_plan" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_plan_org_code_uidx" ON "hr_benefit_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_bonus_eligibility_org_id_idx" ON "hr_bonus_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_candidate_org_id_idx" ON "hr_candidate" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_candidate_org_status_idx" ON "hr_candidate" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_org_normalized_email_uidx" ON "hr_candidate" USING btree ("organization_id","normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_org_create_idempotency_uidx" ON "hr_candidate" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_id_idx" ON "hr_candidate_application" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_candidate_idx" ON "hr_candidate_application" USING btree ("organization_id","candidate_id");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_requisition_idx" ON "hr_candidate_application" USING btree ("organization_id","requisition_id");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_org_status_idx" ON "hr_candidate_application" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_candidate_application_org_candidate_requisition_open_uidx" ON "hr_candidate_application" USING btree ("organization_id","candidate_id","requisition_id") WHERE "hr_candidate_application"."status" NOT IN ('accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE INDEX "hr_candidate_application_status_history_org_application_created_idx" ON "hr_candidate_application_status_history" USING btree ("organization_id","application_id","created_at");--> statement-breakpoint
CREATE INDEX "hr_candidate_application_status_history_org_candidate_idx" ON "hr_candidate_application_status_history" USING btree ("organization_id","candidate_id");--> statement-breakpoint
CREATE INDEX "hr_career_plan_org_id_idx" ON "hr_career_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_career_plan_org_employee_idx" ON "hr_career_plan" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_career_plan_org_code_uidx" ON "hr_career_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_career_plan_org_create_idempotency_uidx" ON "hr_career_plan" USING btree ("organization_id","create_idempotency_key") WHERE "hr_career_plan"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_career_plan_action_org_id_idx" ON "hr_career_plan_action" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_career_plan_action_org_plan_idx" ON "hr_career_plan_action" USING btree ("organization_id","career_plan_id");--> statement-breakpoint
CREATE INDEX "hr_clearance_org_id_idx" ON "hr_clearance" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_clearance_org_case_uidx" ON "hr_clearance" USING btree ("organization_id","offboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_org_id_idx" ON "hr_compensation_grade" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_org_status_idx" ON "hr_compensation_grade" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_grade_org_code_uidx" ON "hr_compensation_grade" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_progression_rule_org_from_idx" ON "hr_compensation_grade_progression_rule" USING btree ("organization_id","from_grade_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_grade_progression_rule_org_status_idx" ON "hr_compensation_grade_progression_rule" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_id_idx" ON "hr_compensation_proposal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_application_idx" ON "hr_compensation_proposal" USING btree ("organization_id","application_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_proposal_org_status_idx" ON "hr_compensation_proposal" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_id_idx" ON "hr_compensation_review" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employee_idx" ON "hr_compensation_review" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employment_idx" ON "hr_compensation_review" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_org_create_idempotency_uidx" ON "hr_compensation_review" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_cycle_org_id_idx" ON "hr_compensation_review_cycle" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_cycle_org_status_idx" ON "hr_compensation_review_cycle" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_cycle_org_code_uidx" ON "hr_compensation_review_cycle" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_cycle_org_create_idempotency_uidx" ON "hr_compensation_review_cycle" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_competency_org_id_idx" ON "hr_competency" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_competency_org_status_idx" ON "hr_competency" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_competency_org_code_uidx" ON "hr_competency" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_competency_org_create_idempotency_uidx" ON "hr_competency" USING btree ("organization_id","create_idempotency_key") WHERE "hr_competency"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_competency_assessment_org_id_idx" ON "hr_competency_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_competency_assessment_org_employee_idx" ON "hr_competency_assessment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_competency_assessment_org_competency_idx" ON "hr_competency_assessment" USING btree ("organization_id","competency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_competency_assessment_org_create_idempotency_uidx" ON "hr_competency_assessment" USING btree ("organization_id","create_idempotency_key") WHERE "hr_competency_assessment"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_department_org_id_idx" ON "hr_department" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_department_org_parent_idx" ON "hr_department" USING btree ("organization_id","parent_department_id");--> statement-breakpoint
CREATE INDEX "hr_department_org_status_idx" ON "hr_department" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_department_org_code_uidx" ON "hr_department" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_department_structure_version_org_department_idx" ON "hr_department_structure_version" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "hr_department_structure_version_org_id_idx" ON "hr_department_structure_version" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_department_structure_version_org_department_open_uidx" ON "hr_department_structure_version" USING btree ("organization_id","department_id") WHERE "hr_department_structure_version"."effective_to" IS NULL AND "hr_department_structure_version"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_development_plan_org_id_idx" ON "hr_development_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_document_requirement_org_id_idx" ON "hr_document_requirement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_document_requirement_org_status_idx" ON "hr_document_requirement" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_document_requirement_org_code_uidx" ON "hr_document_requirement" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_employee_org_id_idx" ON "hr_employee" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_org_updated_at_idx" ON "hr_employee" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "hr_employee_org_legal_name_idx" ON "hr_employee" USING btree ("organization_id","legal_name");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_org_normalized_number_uidx" ON "hr_employee" USING btree ("organization_id","normalized_employee_number");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_org_create_idempotency_uidx" ON "hr_employee" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employee_case_org_id_idx" ON "hr_employee_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_case_org_employee_idx" ON "hr_employee_case" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_case_org_status_idx" ON "hr_employee_case" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_employee_case_org_owner_idx" ON "hr_employee_case" USING btree ("organization_id","owner_actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_case_org_create_idempotency_uidx" ON "hr_employee_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employee_case_action_org_id_idx" ON "hr_employee_case_action" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_case_action_org_case_idx" ON "hr_employee_case_action" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_case_action_org_create_idempotency_uidx" ON "hr_employee_case_action" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employee_case_appeal_org_id_idx" ON "hr_employee_case_appeal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_case_appeal_org_case_idx" ON "hr_employee_case_appeal" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_case_appeal_org_create_idempotency_uidx" ON "hr_employee_case_appeal" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employee_case_event_org_id_idx" ON "hr_employee_case_event" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_case_event_org_case_idx" ON "hr_employee_case_event" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_case_event_org_case_sequence_uidx" ON "hr_employee_case_event" USING btree ("organization_id","case_id","sequence_no");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_id_idx" ON "hr_employee_certification" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_employee_idx" ON "hr_employee_certification" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_course_idx" ON "hr_employee_certification" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_certification_org_completion_uidx" ON "hr_employee_certification" USING btree ("organization_id","completion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_certification_org_create_idempotency_uidx" ON "hr_employee_certification" USING btree ("organization_id","create_idempotency_key") WHERE "hr_employee_certification"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_employee_certification_org_status_idx" ON "hr_employee_certification" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_id_idx" ON "hr_employee_compensation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_employee_idx" ON "hr_employee_compensation" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_compensation_org_employment_idx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_active_uidx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id") WHERE "hr_employee_compensation"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_scheduled_uidx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id") WHERE "hr_employee_compensation"."status" = 'scheduled';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_employment_draft_uidx" ON "hr_employee_compensation" USING btree ("organization_id","employment_id") WHERE "hr_employee_compensation"."status" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_compensation_org_create_idempotency_uidx" ON "hr_employee_compensation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employee_document_org_id_idx" ON "hr_employee_document" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employee_document_org_employee_idx" ON "hr_employee_document" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_employee_document_org_requirement_idx" ON "hr_employee_document" USING btree ("organization_id","requirement_id");--> statement-breakpoint
CREATE INDEX "hr_employee_document_org_status_idx" ON "hr_employee_document" USING btree ("organization_id","verification_status");--> statement-breakpoint
CREATE INDEX "hr_employee_document_org_expires_idx" ON "hr_employee_document" USING btree ("organization_id","expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employee_document_org_create_idempotency_uidx" ON "hr_employee_document" USING btree ("organization_id","create_idempotency_key") WHERE "hr_employee_document"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_employment_org_id_idx" ON "hr_employment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_org_employee_idx" ON "hr_employment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_org_employee_open_uidx" ON "hr_employment" USING btree ("organization_id","employee_id") WHERE "hr_employment"."ends_on" IS NULL;--> statement-breakpoint
CREATE INDEX "hr_employment_calendar_assignment_org_id_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_calendar_assignment_org_employment_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_employment_calendar_assignment_org_employee_idx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_calendar_assignment_org_employment_from_uidx" ON "hr_employment_calendar_assignment" USING btree ("organization_id","employment_id","effective_from");--> statement-breakpoint
CREATE INDEX "hr_employment_confirmation_org_id_idx" ON "hr_employment_confirmation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_employment_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_create_idempotency_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_id_idx" ON "hr_employment_contract" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_employment_idx" ON "hr_employment_contract" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_employment_starts_idx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_contract_org_employment_ref_active_uidx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","reference_code") WHERE "hr_employment_contract"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_id_idx" ON "hr_employment_movement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_employment_idx" ON "hr_employment_movement" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_movement_org_create_idempotency_uidx" ON "hr_employment_movement" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_id_idx" ON "hr_employment_offer" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_status_idx" ON "hr_employment_offer" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_application_active_uidx" ON "hr_employment_offer" USING btree ("organization_id","application_id") WHERE "hr_employment_offer"."status" IN ('draft', 'approved', 'issued');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_accept_idempotency_uidx" ON "hr_employment_offer" USING btree ("organization_id","accept_idempotency_key") WHERE "hr_employment_offer"."accept_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_employment_status_history_org_employment_effective_idx" ON "hr_employment_status_history" USING btree ("organization_id","employment_id","effective_on");--> statement-breakpoint
CREATE INDEX "hr_employment_status_history_org_employee_effective_idx" ON "hr_employment_status_history" USING btree ("organization_id","employee_id","effective_on");--> statement-breakpoint
CREATE INDEX "hr_exit_interview_org_id_idx" ON "hr_exit_interview" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_exit_interview_org_case_uidx" ON "hr_exit_interview" USING btree ("organization_id","offboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_headcount_plan_org_id_idx" ON "hr_headcount_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_headcount_plan_org_status_idx" ON "hr_headcount_plan" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_headcount_plan_org_code_uidx" ON "hr_headcount_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_headcount_plan_org_create_idempotency_uidx" ON "hr_headcount_plan" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_headcount_plan_org_scope_period_approved_uidx" ON "hr_headcount_plan" USING btree ("organization_id","planning_scope_key","period_start","period_end") WHERE "hr_headcount_plan"."status" = 'approved';--> statement-breakpoint
CREATE INDEX "hr_headcount_plan_line_org_id_idx" ON "hr_headcount_plan_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_headcount_plan_line_org_plan_idx" ON "hr_headcount_plan_line" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE INDEX "hr_headcount_reservation_org_id_idx" ON "hr_headcount_reservation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_headcount_reservation_org_plan_idx" ON "hr_headcount_reservation" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE INDEX "hr_headcount_reservation_org_plan_line_idx" ON "hr_headcount_reservation" USING btree ("organization_id","plan_line_id");--> statement-breakpoint
CREATE INDEX "hr_headcount_reservation_org_requisition_idx" ON "hr_headcount_reservation" USING btree ("organization_id","requisition_id");--> statement-breakpoint
CREATE INDEX "hr_headcount_reservation_org_status_idx" ON "hr_headcount_reservation" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_headcount_reservation_org_create_idempotency_uidx" ON "hr_headcount_reservation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_headcount_reservation_org_requisition_active_uidx" ON "hr_headcount_reservation" USING btree ("organization_id","requisition_id") WHERE "hr_headcount_reservation"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_hire_attempt_org_id_idx" ON "hr_hire_attempt" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_hire_attempt_org_idempotency_uidx" ON "hr_hire_attempt" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_hire_attempt_org_offer_open_uidx" ON "hr_hire_attempt" USING btree ("organization_id","offer_id") WHERE "hr_hire_attempt"."status" IN ('in_progress', 'completed');--> statement-breakpoint
CREATE INDEX "hr_interview_org_id_idx" ON "hr_interview" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_interview_org_application_idx" ON "hr_interview" USING btree ("organization_id","application_id");--> statement-breakpoint
CREATE INDEX "hr_interview_org_status_idx" ON "hr_interview" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_interview_evaluation_org_id_idx" ON "hr_interview_evaluation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_interview_evaluation_org_interview_uidx" ON "hr_interview_evaluation" USING btree ("organization_id","interview_id");--> statement-breakpoint
CREATE INDEX "hr_job_org_id_idx" ON "hr_job" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_job_org_status_idx" ON "hr_job" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_org_code_uidx" ON "hr_job" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_job_competency_org_id_idx" ON "hr_job_competency" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_job_competency_org_job_idx" ON "hr_job_competency" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_competency_org_job_competency_active_uidx" ON "hr_job_competency" USING btree ("organization_id","job_id","competency_id") WHERE "hr_job_competency"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_job_definition_version_org_job_idx" ON "hr_job_definition_version" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "hr_job_definition_version_org_id_idx" ON "hr_job_definition_version" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_definition_version_org_job_open_uidx" ON "hr_job_definition_version" USING btree ("organization_id","job_id") WHERE "hr_job_definition_version"."effective_to" IS NULL AND "hr_job_definition_version"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_job_requisition_org_id_idx" ON "hr_job_requisition" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_job_requisition_org_status_idx" ON "hr_job_requisition" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_requisition_org_code_uidx" ON "hr_job_requisition" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_requisition_org_create_idempotency_uidx" ON "hr_job_requisition" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_learning_assessment_org_id_idx" ON "hr_learning_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_id_idx" ON "hr_learning_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_employee_idx" ON "hr_learning_assignment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_course_idx" ON "hr_learning_assignment" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE INDEX "hr_learning_assignment_org_session_idx" ON "hr_learning_assignment" USING btree ("organization_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_assignment_org_employee_course_active_uidx" ON "hr_learning_assignment" USING btree ("organization_id","employee_id","course_id") WHERE "hr_learning_assignment"."status" IN ('pending', 'in_progress');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_assignment_org_create_idempotency_uidx" ON "hr_learning_assignment" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_assignment"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_id_idx" ON "hr_learning_attendance" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_session_idx" ON "hr_learning_attendance" USING btree ("organization_id","session_id");--> statement-breakpoint
CREATE INDEX "hr_learning_attendance_org_employee_idx" ON "hr_learning_attendance" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_attendance_org_assignment_session_uidx" ON "hr_learning_attendance" USING btree ("organization_id","assignment_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_attendance_org_create_idempotency_uidx" ON "hr_learning_attendance" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_attendance"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_id_idx" ON "hr_learning_completion" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_employee_idx" ON "hr_learning_completion" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_learning_completion_org_course_idx" ON "hr_learning_completion" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_completion_org_assignment_uidx" ON "hr_learning_completion" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_completion_org_create_idempotency_uidx" ON "hr_learning_completion" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_completion"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_learning_course_org_id_idx" ON "hr_learning_course" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_course_org_code_uidx" ON "hr_learning_course" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_course_org_create_idempotency_uidx" ON "hr_learning_course" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_course"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_learning_course_org_status_idx" ON "hr_learning_course" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_learning_program_org_id_idx" ON "hr_learning_program" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_id_idx" ON "hr_learning_session" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_course_idx" ON "hr_learning_session" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_session_org_code_uidx" ON "hr_learning_session" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_learning_session_org_create_idempotency_uidx" ON "hr_learning_session" USING btree ("organization_id","create_idempotency_key") WHERE "hr_learning_session"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_learning_session_org_status_idx" ON "hr_learning_session" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_leave_adjustment_org_id_idx" ON "hr_leave_adjustment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_adjustment_org_entitlement_idx" ON "hr_leave_adjustment" USING btree ("organization_id","entitlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_leave_adjustment_org_create_idempotency_uidx" ON "hr_leave_adjustment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_leave_approval_decision_org_id_idx" ON "hr_leave_approval_decision" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_approval_decision_org_request_idx" ON "hr_leave_approval_decision" USING btree ("organization_id","request_id");--> statement-breakpoint
CREATE INDEX "hr_leave_entitlement_org_id_idx" ON "hr_leave_entitlement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_entitlement_org_employee_idx" ON "hr_leave_entitlement" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_leave_entitlement_org_employment_idx" ON "hr_leave_entitlement" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_leave_entitlement_org_policy_idx" ON "hr_leave_entitlement" USING btree ("organization_id","policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_leave_entitlement_org_create_idempotency_uidx" ON "hr_leave_entitlement" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_leave_entitlement_org_employment_policy_period_active_uidx" ON "hr_leave_entitlement" USING btree ("organization_id","employment_id","policy_id","period_start") WHERE "hr_leave_entitlement"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_leave_policy_org_id_idx" ON "hr_leave_policy" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_policy_org_status_idx" ON "hr_leave_policy" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_leave_policy_org_code_effective_uidx" ON "hr_leave_policy" USING btree ("organization_id","code","effective_from");--> statement-breakpoint
CREATE INDEX "hr_leave_policy_eligibility_org_id_idx" ON "hr_leave_policy_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_policy_eligibility_org_policy_idx" ON "hr_leave_policy_eligibility" USING btree ("organization_id","policy_id");--> statement-breakpoint
CREATE INDEX "hr_leave_request_org_id_idx" ON "hr_leave_request" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_request_org_employee_idx" ON "hr_leave_request" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_leave_request_org_employment_idx" ON "hr_leave_request" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_leave_request_org_status_idx" ON "hr_leave_request" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_leave_request_org_create_idempotency_uidx" ON "hr_leave_request" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_leave_request_segment_org_id_idx" ON "hr_leave_request_segment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_leave_request_segment_org_request_idx" ON "hr_leave_request_segment" USING btree ("organization_id","request_id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_access_revocation_org_id_idx" ON "hr_offboarding_access_revocation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_access_revocation_org_case_uidx" ON "hr_offboarding_access_revocation" USING btree ("organization_id","offboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_case_org_id_idx" ON "hr_offboarding_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_case_org_employment_idx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_employment_open_uidx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id") WHERE "hr_offboarding_case"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_create_idempotency_uidx" ON "hr_offboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_offboarding_payroll_handoff_org_id_idx" ON "hr_offboarding_payroll_handoff" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_payroll_handoff_org_case_uidx" ON "hr_offboarding_payroll_handoff" USING btree ("organization_id","offboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_id_idx" ON "hr_offboarding_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_case_idx" ON "hr_offboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_task_org_case_code_uidx" ON "hr_offboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
CREATE INDEX "hr_onboarding_access_handoff_org_id_idx" ON "hr_onboarding_access_handoff" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_access_handoff_org_case_uidx" ON "hr_onboarding_access_handoff" USING btree ("organization_id","onboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_id_idx" ON "hr_onboarding_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_employment_idx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_employment_open_uidx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id") WHERE "hr_onboarding_case"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_create_idempotency_uidx" ON "hr_onboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_onboarding_equipment_handoff_org_id_idx" ON "hr_onboarding_equipment_handoff" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_equipment_handoff_org_case_uidx" ON "hr_onboarding_equipment_handoff" USING btree ("organization_id","onboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_orientation_org_id_idx" ON "hr_onboarding_orientation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_orientation_org_case_uidx" ON "hr_onboarding_orientation" USING btree ("organization_id","onboarding_case_id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_id_idx" ON "hr_onboarding_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_case_idx" ON "hr_onboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_task_org_case_code_uidx" ON "hr_onboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
CREATE INDEX "hr_overtime_approval_org_id_idx" ON "hr_overtime_approval" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_overtime_approval_org_request_idx" ON "hr_overtime_approval" USING btree ("organization_id","overtime_request_id");--> statement-breakpoint
CREATE INDEX "hr_overtime_request_org_id_idx" ON "hr_overtime_request" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_overtime_request_org_employee_idx" ON "hr_overtime_request" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_overtime_request_org_status_idx" ON "hr_overtime_request" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_overtime_request_org_create_idempotency_uidx" ON "hr_overtime_request" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_id_idx" ON "hr_performance_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_review_idx" ON "hr_performance_assessment" USING btree ("organization_id","review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_assessment_org_review_participant_uidx" ON "hr_performance_assessment" USING btree ("organization_id","review_id","participant_id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_id_idx" ON "hr_performance_cycle" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_status_idx" ON "hr_performance_cycle" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_code_uidx" ON "hr_performance_cycle" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_create_idempotency_uidx" ON "hr_performance_cycle" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_eligibility_org_id_idx" ON "hr_performance_cycle_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_eligibility_org_cycle_uidx" ON "hr_performance_cycle_eligibility" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_id_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_cycle_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_participant_org_cycle_employment_active_uidx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id","employment_id") WHERE "hr_performance_cycle_participant"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_review_period_org_id_idx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_review_period_org_cycle_idx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_review_period_org_cycle_kind_uidx" ON "hr_performance_cycle_review_period" USING btree ("organization_id","cycle_id","kind");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_id_idx" ON "hr_performance_goal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_cycle_idx" ON "hr_performance_goal" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_employee_idx" ON "hr_performance_goal" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_aligned_idx" ON "hr_performance_goal" USING btree ("organization_id","aligned_to_goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_goal_org_create_idempotency_uidx" ON "hr_performance_goal" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_progress_org_id_idx" ON "hr_performance_goal_progress" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_progress_org_goal_idx" ON "hr_performance_goal_progress" USING btree ("organization_id","goal_id");--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_checkpoint_org_id_idx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_checkpoint_org_plan_idx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_improvement_checkpoint_org_plan_sequence_uidx" ON "hr_performance_improvement_checkpoint" USING btree ("organization_id","plan_id","sequence_number");--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_plan_org_id_idx" ON "hr_performance_improvement_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_improvement_plan_org_review_idx" ON "hr_performance_improvement_plan" USING btree ("organization_id","review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_improvement_plan_org_create_idempotency_uidx" ON "hr_performance_improvement_plan" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_id_idx" ON "hr_performance_review" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_cycle_idx" ON "hr_performance_review" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE INDEX "hr_performance_review_org_employee_idx" ON "hr_performance_review" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_review_org_finalize_idempotency_uidx" ON "hr_performance_review" USING btree ("organization_id","finalize_idempotency_key") WHERE "hr_performance_review"."finalize_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_performance_review_participant_org_id_idx" ON "hr_performance_review_participant" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_review_participant_org_review_idx" ON "hr_performance_review_participant" USING btree ("organization_id","review_id");--> statement-breakpoint
CREATE INDEX "hr_person_org_id_idx" ON "hr_person" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_person_org_legal_name_idx" ON "hr_person" USING btree ("organization_id","legal_name");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_org_create_idempotency_uidx" ON "hr_person" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_person_idx" ON "hr_person_contact" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_id_idx" ON "hr_person_contact" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_type_normalized_idx" ON "hr_person_contact" USING btree ("organization_id","contact_type","normalized_value");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_contact_org_create_idempotency_uidx" ON "hr_person_contact" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_contact_org_person_type_primary_uidx" ON "hr_person_contact" USING btree ("organization_id","person_id","contact_type") WHERE "hr_person_contact"."status" = 'active' AND "hr_person_contact"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_person_idx" ON "hr_person_identifier" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_id_idx" ON "hr_person_identifier" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_type_fingerprint_idx" ON "hr_person_identifier" USING btree ("organization_id","identifier_type","identifier_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identifier_org_create_idempotency_uidx" ON "hr_person_identifier" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identifier_org_type_fingerprint_open_uidx" ON "hr_person_identifier" USING btree ("organization_id","identifier_type","identifier_fingerprint") WHERE "hr_person_identifier"."effective_to" IS NULL AND "hr_person_identifier"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_person_identity_version_org_person_idx" ON "hr_person_identity_version" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "hr_person_identity_version_org_id_idx" ON "hr_person_identity_version" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identity_version_org_person_open_uidx" ON "hr_person_identity_version" USING btree ("organization_id","person_id") WHERE "hr_person_identity_version"."effective_to" IS NULL AND "hr_person_identity_version"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_id_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_employee_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_policy_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","policy_code","policy_version");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_status_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","requirement_status");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_status_due_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","requirement_status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_policy_acknowledgement_org_create_idempotency_uidx" ON "hr_policy_acknowledgement" USING btree ("organization_id","create_idempotency_key") WHERE "hr_policy_acknowledgement"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_position_org_id_idx" ON "hr_position" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_position_org_status_idx" ON "hr_position" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_position_org_department_idx" ON "hr_position" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "hr_position_org_job_idx" ON "hr_position" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_position_org_code_uidx" ON "hr_position" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "hr_position_definition_version_org_position_idx" ON "hr_position_definition_version" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE INDEX "hr_position_definition_version_org_id_idx" ON "hr_position_definition_version" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_position_definition_version_org_position_open_uidx" ON "hr_position_definition_version" USING btree ("organization_id","position_id") WHERE "hr_position_definition_version"."effective_to" IS NULL AND "hr_position_definition_version"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_probation_assessment_org_id_idx" ON "hr_probation_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_probation_assessment_org_probation_review_idx" ON "hr_probation_assessment" USING btree ("organization_id","probation_review_id");--> statement-breakpoint
CREATE INDEX "hr_probation_review_org_id_idx" ON "hr_probation_review" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_probation_review_org_employment_idx" ON "hr_probation_review" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_probation_review_org_employment_open_uidx" ON "hr_probation_review" USING btree ("organization_id","employment_id") WHERE "hr_probation_review"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_probation_review_org_create_idempotency_uidx" ON "hr_probation_review" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_id_idx" ON "hr_reporting_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_employee_idx" ON "hr_reporting_line" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_reporting_line_org_manager_idx" ON "hr_reporting_line" USING btree ("organization_id","manager_employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_reporting_line_org_employee_open_primary_uidx" ON "hr_reporting_line" USING btree ("organization_id","employee_id") WHERE "hr_reporting_line"."ends_on" IS NULL AND "hr_reporting_line"."relationship_kind" = 'primary';--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_id_idx" ON "hr_salary_band" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_grade_idx" ON "hr_salary_band" USING btree ("organization_id","grade_id");--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_status_idx" ON "hr_salary_band" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_salary_band_org_supersedes_idx" ON "hr_salary_band" USING btree ("organization_id","supersedes_salary_band_id");--> statement-breakpoint
CREATE INDEX "hr_shift_org_id_idx" ON "hr_shift" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_shift_org_status_idx" ON "hr_shift" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_shift_org_code_effective_uidx" ON "hr_shift" USING btree ("organization_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_shift_org_create_idempotency_uidx" ON "hr_shift" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_shift_assignment_org_id_idx" ON "hr_shift_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignment_org_employee_date_idx" ON "hr_shift_assignment" USING btree ("organization_id","employee_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "hr_shift_assignment_org_status_idx" ON "hr_shift_assignment" USING btree ("organization_id","publication_status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_shift_assignment_org_create_idempotency_uidx" ON "hr_shift_assignment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_shift_assignment_segment_org_id_idx" ON "hr_shift_assignment_segment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_shift_assignment_segment_org_assignment_idx" ON "hr_shift_assignment_segment" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE INDEX "hr_shift_break_org_id_idx" ON "hr_shift_break" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_shift_break_org_shift_idx" ON "hr_shift_break" USING btree ("organization_id","shift_id");--> statement-breakpoint
CREATE INDEX "hr_succession_candidate_org_id_idx" ON "hr_succession_candidate" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_succession_candidate_org_plan_idx" ON "hr_succession_candidate" USING btree ("organization_id","succession_plan_id");--> statement-breakpoint
CREATE INDEX "hr_succession_candidate_org_employee_idx" ON "hr_succession_candidate" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_candidate_org_create_idempotency_uidx" ON "hr_succession_candidate" USING btree ("organization_id","create_idempotency_key") WHERE "hr_succession_candidate"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_succession_plan_org_id_idx" ON "hr_succession_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_succession_plan_org_position_idx" ON "hr_succession_plan" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_plan_org_code_uidx" ON "hr_succession_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_plan_org_create_idempotency_uidx" ON "hr_succession_plan" USING btree ("organization_id","create_idempotency_key") WHERE "hr_succession_plan"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_id_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_profile_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","talent_profile_id");--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_position_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_critical_role_readiness_org_profile_position_current_uidx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","talent_profile_id","position_id") WHERE "hr_talent_critical_role_readiness"."status" = 'current';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_critical_role_readiness_org_create_idempotency_uidx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_critical_role_readiness"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_talent_pool_org_id_idx" ON "hr_talent_pool" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_talent_pool_org_status_idx" ON "hr_talent_pool" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_pool_org_code_uidx" ON "hr_talent_pool" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_pool_org_create_idempotency_uidx" ON "hr_talent_pool" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_pool"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_talent_pool_member_org_id_idx" ON "hr_talent_pool_member" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_talent_pool_member_org_pool_idx" ON "hr_talent_pool_member" USING btree ("organization_id","pool_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_pool_member_org_pool_employee_active_uidx" ON "hr_talent_pool_member" USING btree ("organization_id","pool_id","employee_id") WHERE "hr_talent_pool_member"."status" IN ('nominated', 'approved');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_pool_member_org_create_idempotency_uidx" ON "hr_talent_pool_member" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_pool_member"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_talent_profile_org_id_idx" ON "hr_talent_profile" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_org_employee_uidx" ON "hr_talent_profile" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_org_create_idempotency_uidx" ON "hr_talent_profile" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_profile"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_talent_profile_assessment_org_id_idx" ON "hr_talent_profile_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_talent_profile_assessment_org_profile_idx" ON "hr_talent_profile_assessment" USING btree ("organization_id","talent_profile_id");--> statement-breakpoint
CREATE INDEX "hr_talent_profile_mobility_org_id_idx" ON "hr_talent_profile_mobility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_talent_profile_mobility_org_profile_idx" ON "hr_talent_profile_mobility" USING btree ("organization_id","talent_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_mobility_org_profile_dimension_current_uidx" ON "hr_talent_profile_mobility" USING btree ("organization_id","talent_profile_id","dimension") WHERE "hr_talent_profile_mobility"."status" = 'current';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_mobility_org_create_idempotency_uidx" ON "hr_talent_profile_mobility" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_profile_mobility"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_termination_org_id_idx" ON "hr_termination" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_termination_org_employment_idx" ON "hr_termination" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_employment_finalized_uidx" ON "hr_termination" USING btree ("organization_id","employment_id") WHERE "hr_termination"."status" = 'finalized';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_employment_draft_uidx" ON "hr_termination" USING btree ("organization_id","employment_id") WHERE "hr_termination"."status" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_create_idempotency_uidx" ON "hr_termination" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_time_approval_authority_assignment_org_id_idx" ON "hr_time_approval_authority_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_time_approval_authority_assignment_org_actor_idx" ON "hr_time_approval_authority_assignment" USING btree ("organization_id","actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_time_approval_authority_assignment_org_actor_authority_from_uidx" ON "hr_time_approval_authority_assignment" USING btree ("organization_id","actor_user_id","authority","effective_from");--> statement-breakpoint
CREATE INDEX "hr_time_policy_org_id_idx" ON "hr_time_policy" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_time_policy_org_code_from_uidx" ON "hr_time_policy" USING btree ("organization_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_time_policy_org_create_idem_uidx" ON "hr_time_policy" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_time_policy_assignment_org_id_idx" ON "hr_time_policy_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_time_policy_assignment_org_employment_idx" ON "hr_time_policy_assignment" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_time_policy_assignment_org_employment_from_uidx" ON "hr_time_policy_assignment" USING btree ("organization_id","employment_id","effective_from");--> statement-breakpoint
CREATE INDEX "hr_timesheet_org_id_idx" ON "hr_timesheet" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_timesheet_org_employee_idx" ON "hr_timesheet" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_timesheet_org_status_idx" ON "hr_timesheet" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_timesheet_org_create_idempotency_uidx" ON "hr_timesheet" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_timesheet_org_submission_reference_uidx" ON "hr_timesheet" USING btree ("organization_id","submission_reference") WHERE "hr_timesheet"."submission_reference" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "hr_timesheet_org_employee_period_active_uidx" ON "hr_timesheet" USING btree ("organization_id","employee_id","period_start","period_end") WHERE "hr_timesheet"."status" NOT IN ('superseded', 'rejected');--> statement-breakpoint
CREATE INDEX "hr_timesheet_approval_decision_org_id_idx" ON "hr_timesheet_approval_decision" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_timesheet_approval_decision_org_timesheet_idx" ON "hr_timesheet_approval_decision" USING btree ("organization_id","timesheet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_timesheet_approval_decision_org_submission_step_uidx" ON "hr_timesheet_approval_decision" USING btree ("organization_id","submission_reference","step_index");--> statement-breakpoint
CREATE INDEX "hr_timesheet_entry_org_id_idx" ON "hr_timesheet_entry" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_timesheet_entry_org_timesheet_idx" ON "hr_timesheet_entry" USING btree ("organization_id","timesheet_id");--> statement-breakpoint
CREATE INDEX "hr_timesheet_entry_org_employee_date_idx" ON "hr_timesheet_entry" USING btree ("organization_id","employee_id","work_date");--> statement-breakpoint
CREATE INDEX "hr_user_employee_org_user_idx" ON "hr_user_employee" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "hr_user_employee_org_employee_idx" ON "hr_user_employee" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_user_employee_effective_idx" ON "hr_user_employee" USING btree ("organization_id","user_id","effective_from","effective_until");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_user_employee_org_user_emp_from_uidx" ON "hr_user_employee" USING btree ("organization_id","user_id","employee_id","effective_from");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_id_idx" ON "hr_work_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_employment_idx" ON "hr_work_assignment" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_position_idx" ON "hr_work_assignment" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_legal_entity_idx" ON "hr_work_assignment" USING btree ("organization_id","legal_entity_dimension_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_business_unit_idx" ON "hr_work_assignment" USING btree ("organization_id","business_unit_dimension_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_location_idx" ON "hr_work_assignment" USING btree ("organization_id","location_dimension_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_cost_centre_idx" ON "hr_work_assignment" USING btree ("organization_id","cost_centre_dimension_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_project_idx" ON "hr_work_assignment" USING btree ("organization_id","project_dimension_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_employment_starts_idx" ON "hr_work_assignment" USING btree ("organization_id","employment_id","starts_on");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_assignment_org_employment_open_uidx" ON "hr_work_assignment" USING btree ("organization_id","employment_id") WHERE "hr_work_assignment"."ends_on" IS NULL;--> statement-breakpoint
CREATE INDEX "hr_work_calendar_org_id_idx" ON "hr_work_calendar" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_org_status_idx" ON "hr_work_calendar" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_calendar_org_code_from_uidx" ON "hr_work_calendar" USING btree ("organization_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_calendar_org_create_idempotency_uidx" ON "hr_work_calendar" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_holiday_org_id_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_holiday_org_calendar_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","calendar_id");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_holiday_org_date_idx" ON "hr_work_calendar_holiday" USING btree ("organization_id","holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_calendar_holiday_org_calendar_date_loc_jur_uidx" ON "hr_work_calendar_holiday" USING btree ("organization_id","calendar_id","holiday_date","location_code","jurisdiction");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_scope_assignment_org_id_idx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_calendar_scope_assignment_org_scope_idx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","scope_type","scope_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_calendar_scope_assignment_org_scope_from_uidx" ON "hr_work_calendar_scope_assignment" USING btree ("organization_id","scope_type","scope_key","effective_from");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_id_idx" ON "hr_work_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_employee_idx" ON "hr_work_eligibility" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_status_idx" ON "hr_work_eligibility" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_country_idx" ON "hr_work_eligibility" USING btree ("organization_id","country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_eligibility_org_create_idempotency_uidx" ON "hr_work_eligibility" USING btree ("organization_id","create_idempotency_key") WHERE "hr_work_eligibility"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_worker_org_id_idx" ON "hr_worker" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_worker_org_person_idx" ON "hr_worker" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE INDEX "hr_worker_org_employee_idx" ON "hr_worker" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_create_idempotency_uidx" ON "hr_worker" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_person_uidx" ON "hr_worker" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_org_employee_uidx" ON "hr_worker" USING btree ("organization_id","employee_id") WHERE "hr_worker"."employee_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_worker_classification_version_org_worker_idx" ON "hr_worker_classification_version" USING btree ("organization_id","worker_id");--> statement-breakpoint
CREATE INDEX "hr_worker_classification_version_org_id_idx" ON "hr_worker_classification_version" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_classification_version_org_worker_open_uidx" ON "hr_worker_classification_version" USING btree ("organization_id","worker_id") WHERE "hr_worker_classification_version"."effective_to" IS NULL AND "hr_worker_classification_version"."lineage_status" = 'active';--> statement-breakpoint
CREATE INDEX "stock_balance_org_id_idx" ON "stock_balance" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "stock_balance_org_warehouse_idx" ON "stock_balance" USING btree ("organization_id","warehouse_id");--> statement-breakpoint
CREATE INDEX "stock_balance_org_item_idx" ON "stock_balance" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balance_org_warehouse_item_uidx" ON "stock_balance" USING btree ("organization_id","warehouse_id","item_id");--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_id_idx" ON "stock_ledger_entry" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_movement_idx" ON "stock_ledger_entry" USING btree ("organization_id","movement_id");--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_warehouse_item_idx" ON "stock_ledger_entry" USING btree ("organization_id","warehouse_id","item_id");--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_created_at_idx" ON "stock_ledger_entry" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_ledger_sequence_idx" ON "stock_ledger_entry" USING btree ("organization_id","ledger_sequence");--> statement-breakpoint
CREATE INDEX "stock_movement_org_id_idx" ON "stock_movement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "stock_movement_org_status_idx" ON "stock_movement" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "stock_movement_org_type_idx" ON "stock_movement" USING btree ("organization_id","movement_type");--> statement-breakpoint
CREATE INDEX "stock_movement_org_updated_at_idx" ON "stock_movement" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_org_normalized_code_uidx" ON "stock_movement" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_org_create_idempotency_uidx" ON "stock_movement" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_org_source_event_uidx" ON "stock_movement" USING btree ("organization_id","source_module","source_event_id");--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_id_idx" ON "stock_movement_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_movement_idx" ON "stock_movement_line" USING btree ("organization_id","movement_id");--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_item_idx" ON "stock_movement_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_line_org_movement_line_no_uidx" ON "stock_movement_line" USING btree ("organization_id","movement_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_line_org_movement_idempotency_uidx" ON "stock_movement_line" USING btree ("organization_id","movement_id","line_idempotency_key");--> statement-breakpoint
CREATE INDEX "stock_reservation_org_id_idx" ON "stock_reservation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "stock_reservation_org_status_idx" ON "stock_reservation" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "stock_reservation_org_warehouse_item_idx" ON "stock_reservation" USING btree ("organization_id","warehouse_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_reservation_org_normalized_code_uidx" ON "stock_reservation" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_reservation_org_create_idempotency_uidx" ON "stock_reservation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "md_change_request_org_id_idx" ON "md_change_request" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_change_request_org_status_idx" ON "md_change_request" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "md_change_request_org_normalized_code_uidx" ON "md_change_request" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "md_import_batch_org_id_idx" ON "md_import_batch" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_import_batch_org_idempotency_uidx" ON "md_import_batch" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "md_item_org_id_idx" ON "md_item" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_item_org_status_idx" ON "md_item" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_item_org_group_idx" ON "md_item" USING btree ("organization_id","item_group_id");--> statement-breakpoint
CREATE INDEX "md_item_base_uom_idx" ON "md_item" USING btree ("base_uom_id");--> statement-breakpoint
CREATE INDEX "md_item_org_updated_at_idx" ON "md_item" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_org_normalized_code_live_uidx" ON "md_item" USING btree ("organization_id","normalized_code") WHERE "md_item"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_alias_org_item_idx" ON "md_item_alias" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_alias_org_normalized_live_uidx" ON "md_item_alias" USING btree ("organization_id","normalized_alias") WHERE "md_item_alias"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_barcode_org_item_idx" ON "md_item_barcode" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_barcode_org_barcode_uidx" ON "md_item_barcode" USING btree ("organization_id","barcode");--> statement-breakpoint
CREATE INDEX "md_item_external_id_org_item_idx" ON "md_item_external_id" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_external_id_org_sys_ns_ext_uidx" ON "md_item_external_id" USING btree ("organization_id","system","namespace","external_id");--> statement-breakpoint
CREATE INDEX "md_item_group_org_id_idx" ON "md_item_group" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_item_group_org_status_idx" ON "md_item_group" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_item_group_org_parent_idx" ON "md_item_group" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "md_item_group_org_updated_at_idx" ON "md_item_group" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_group_org_normalized_code_live_uidx" ON "md_item_group" USING btree ("organization_id","normalized_code") WHERE "md_item_group"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_template_org_id_idx" ON "md_item_template" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_item_template_org_status_idx" ON "md_item_template" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_item_template_org_updated_at_idx" ON "md_item_template" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_org_normalized_code_live_uidx" ON "md_item_template" USING btree ("organization_id","normalized_code") WHERE "md_item_template"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_template_attribute_org_template_idx" ON "md_item_template_attribute" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_attribute_org_template_code_uidx" ON "md_item_template_attribute" USING btree ("organization_id","template_id","normalized_code");--> statement-breakpoint
CREATE INDEX "md_item_template_attribute_option_org_attr_idx" ON "md_item_template_attribute_option" USING btree ("organization_id","attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_template_attribute_option_org_attr_code_uidx" ON "md_item_template_attribute_option" USING btree ("organization_id","attribute_id","normalized_code");--> statement-breakpoint
CREATE INDEX "md_item_uom_org_item_idx" ON "md_item_uom" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "md_item_uom_uom_idx" ON "md_item_uom" USING btree ("uom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_uom_org_item_uom_usage_uidx" ON "md_item_uom" USING btree ("organization_id","item_id","uom_id","usage");--> statement-breakpoint
CREATE INDEX "md_item_variant_org_template_idx" ON "md_item_variant" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_org_item_uidx" ON "md_item_variant" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_org_template_combination_live_uidx" ON "md_item_variant" USING btree ("organization_id","template_id","combination_key") WHERE "md_item_variant"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_item_variant_attribute_value_org_variant_idx" ON "md_item_variant_attribute_value" USING btree ("organization_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_item_variant_attribute_value_org_variant_attr_uidx" ON "md_item_variant_attribute_value" USING btree ("organization_id","variant_id","attribute_id");--> statement-breakpoint
CREATE INDEX "md_org_dimension_org_kind_key_idx" ON "md_organization_dimension" USING btree ("organization_id","kind","normalized_key");--> statement-breakpoint
CREATE INDEX "md_org_dimension_org_effective_idx" ON "md_organization_dimension" USING btree ("organization_id","effective_from","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "md_org_dimension_org_kind_key_from_uidx" ON "md_organization_dimension" USING btree ("organization_id","kind","normalized_key","effective_from");--> statement-breakpoint
CREATE INDEX "md_party_org_id_idx" ON "md_party" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_party_org_status_idx" ON "md_party" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_party_org_updated_at_idx" ON "md_party" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_org_normalized_code_live_uidx" ON "md_party" USING btree ("organization_id","normalized_code") WHERE "md_party"."retired_at" IS NULL AND "md_party"."merged_into_id" IS NULL;--> statement-breakpoint
CREATE INDEX "md_party_address_org_party_idx" ON "md_party_address" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_address_org_country_idx" ON "md_party_address" USING btree ("organization_id","country_id");--> statement-breakpoint
CREATE INDEX "md_party_contact_org_party_idx" ON "md_party_contact" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_external_id_org_party_idx" ON "md_party_external_id" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_org_sys_ns_ext_uidx" ON "md_party_external_id" USING btree ("organization_id","system","namespace","external_id");--> statement-breakpoint
CREATE INDEX "md_party_relationship_org_from_idx" ON "md_party_relationship" USING btree ("organization_id","from_party_id");--> statement-breakpoint
CREATE INDEX "md_party_relationship_org_to_idx" ON "md_party_relationship" USING btree ("organization_id","to_party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_relationship_org_pair_type_uidx" ON "md_party_relationship" USING btree ("organization_id","from_party_id","to_party_id","relationship_type");--> statement-breakpoint
CREATE INDEX "md_party_role_org_party_idx" ON "md_party_role" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_party_role_org_status_idx" ON "md_party_role" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_role_org_party_code_live_uidx" ON "md_party_role" USING btree ("organization_id","party_id","role_code") WHERE "md_party_role"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_payment_term_org_id_idx" ON "md_payment_term" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_payment_term_org_status_idx" ON "md_payment_term" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_payment_term_org_updated_at_idx" ON "md_payment_term" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_payment_term_org_normalized_code_live_uidx" ON "md_payment_term" USING btree ("organization_id","normalized_code") WHERE "md_payment_term"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_id_idx" ON "md_tax_registration" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_status_idx" ON "md_tax_registration" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_party_idx" ON "md_tax_registration" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "md_tax_registration_org_updated_at_idx" ON "md_tax_registration" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_tax_registration_live_identity_uidx" ON "md_tax_registration" USING btree ("organization_id","party_id","jurisdiction_country_id","registration_type","normalized_registration_number") WHERE "md_tax_registration"."retired_at" IS NULL AND "md_tax_registration"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_warehouse_org_id_idx" ON "md_warehouse" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_status_idx" ON "md_warehouse" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_parent_idx" ON "md_warehouse" USING btree ("organization_id","parent_id");--> statement-breakpoint
CREATE INDEX "md_warehouse_org_updated_at_idx" ON "md_warehouse" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_org_normalized_code_live_uidx" ON "md_warehouse" USING btree ("organization_id","normalized_code") WHERE "md_warehouse"."retired_at" IS NULL;--> statement-breakpoint
CREATE INDEX "md_warehouse_external_id_org_wh_idx" ON "md_warehouse_external_id" USING btree ("organization_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_external_id_org_sys_ns_ext_uidx" ON "md_warehouse_external_id" USING btree ("organization_id","system","namespace","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_country_code_uidx" ON "ref_country" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_currency_code_uidx" ON "ref_currency" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_language_code_uidx" ON "ref_language" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_time_zone_iana_name_uidx" ON "ref_time_zone" USING btree ("iana_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_uom_code_uidx" ON "ref_uom" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ref_uom_dimension_id_idx" ON "ref_uom" USING btree ("dimension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_uom_dimension_code_uidx" ON "ref_uom_dimension" USING btree ("code");--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_id_idx" ON "supplier_allocation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_supplier_idx" ON "supplier_allocation" USING btree ("organization_id","supplier_party_id");--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_invoice_idx" ON "supplier_allocation" USING btree ("organization_id","supplier_invoice_id");--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_credit_note_idx" ON "supplier_allocation" USING btree ("organization_id","credit_note_id");--> statement-breakpoint
CREATE INDEX "supplier_balance_projection_org_id_idx" ON "supplier_balance_projection" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_balance_projection_org_supplier_currency_uidx" ON "supplier_balance_projection" USING btree ("organization_id","supplier_party_id","currency_code");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_id_idx" ON "supplier_credit_note" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_status_idx" ON "supplier_credit_note" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_supplier_idx" ON "supplier_credit_note" USING btree ("organization_id","supplier_party_id");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_invoice_idx" ON "supplier_credit_note" USING btree ("organization_id","supplier_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_credit_note_org_normalized_code_uidx" ON "supplier_credit_note" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_line_org_id_idx" ON "supplier_credit_note_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "supplier_credit_note_line_org_credit_note_idx" ON "supplier_credit_note_line" USING btree ("organization_id","credit_note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_credit_note_line_org_credit_note_line_no_uidx" ON "supplier_credit_note_line" USING btree ("organization_id","credit_note_id","line_no");--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_id_idx" ON "supplier_invoice" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_status_idx" ON "supplier_invoice" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_supplier_idx" ON "supplier_invoice" USING btree ("organization_id","supplier_party_id");--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_purchase_order_idx" ON "supplier_invoice" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_invoice_org_normalized_code_uidx" ON "supplier_invoice" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_id_idx" ON "supplier_invoice_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_invoice_idx" ON "supplier_invoice_line" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_item_idx" ON "supplier_invoice_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_invoice_line_org_invoice_line_no_uidx" ON "supplier_invoice_line" USING btree ("organization_id","invoice_id","line_no");--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_id_idx" ON "three_way_match_result" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_invoice_idx" ON "three_way_match_result" USING btree ("organization_id","supplier_invoice_id");--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_purchase_order_idx" ON "three_way_match_result" USING btree ("organization_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_goods_receipt_idx" ON "three_way_match_result" USING btree ("organization_id","goods_receipt_id");--> statement-breakpoint
CREATE INDEX "payment_org_id_idx" ON "payment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payment_org_status_idx" ON "payment" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "payment_org_direction_idx" ON "payment" USING btree ("organization_id","direction");--> statement-breakpoint
CREATE INDEX "payment_org_counterparty_idx" ON "payment" USING btree ("organization_id","counterparty_id");--> statement-breakpoint
CREATE INDEX "payment_org_account_idx" ON "payment" USING btree ("organization_id","payment_account_id");--> statement-breakpoint
CREATE INDEX "payment_org_transfer_group_idx" ON "payment" USING btree ("organization_id","transfer_group_id");--> statement-breakpoint
CREATE INDEX "payment_org_original_idx" ON "payment" USING btree ("organization_id","original_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_org_normalized_code_uidx" ON "payment" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_org_create_idempotency_uidx" ON "payment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_account_org_id_idx" ON "payment_account" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_account_org_normalized_code_uidx" ON "payment_account" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "payment_allocation_org_id_idx" ON "payment_allocation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payment_allocation_org_payment_idx" ON "payment_allocation" USING btree ("organization_id","payment_id");--> statement-breakpoint
CREATE INDEX "payment_allocation_org_target_idx" ON "payment_allocation" USING btree ("organization_id","target_module","target_document_id");--> statement-breakpoint
CREATE INDEX "payment_reversal_org_id_idx" ON "payment_reversal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reversal_org_payment_uidx" ON "payment_reversal" USING btree ("organization_id","payment_id");--> statement-breakpoint
CREATE INDEX "payroll_adjustment_org_id_idx" ON "payroll_adjustment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_calendar_org_id_idx" ON "payroll_calendar" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_calendar_org_status_idx" ON "payroll_calendar" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_calendar_org_create_idempotency_uidx" ON "payroll_calendar" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_calendar_org_code_from_uidx" ON "payroll_calendar" USING btree ("organization_id","code","effective_from");--> statement-breakpoint
CREATE INDEX "payroll_deduction_rule_org_id_idx" ON "payroll_deduction_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_deduction_rule_org_pay_group_idx" ON "payroll_deduction_rule" USING btree ("organization_id","pay_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_deduction_rule_org_code_from_uidx" ON "payroll_deduction_rule" USING btree ("organization_id","pay_group_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_deduction_rule_org_create_idempotency_uidx" ON "payroll_deduction_rule" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_earning_rule_org_id_idx" ON "payroll_earning_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_earning_rule_org_pay_group_idx" ON "payroll_earning_rule" USING btree ("organization_id","pay_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_earning_rule_org_code_from_uidx" ON "payroll_earning_rule" USING btree ("organization_id","pay_group_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_earning_rule_org_create_idempotency_uidx" ON "payroll_earning_rule" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_employee_assignment_org_id_idx" ON "payroll_employee_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_employee_assignment_org_employee_idx" ON "payroll_employee_assignment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_employee_assignment_org_create_idempotency_uidx" ON "payroll_employee_assignment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_employee_assignment_org_employee_from_uidx" ON "payroll_employee_assignment" USING btree ("organization_id","employee_id","effective_from");--> statement-breakpoint
CREATE INDEX "payroll_exception_org_id_idx" ON "payroll_exception" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_exception_org_run_idx" ON "payroll_exception" USING btree ("organization_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_exception_org_id_uidx" ON "payroll_exception" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_pay_group_org_id_idx" ON "payroll_pay_group" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_pay_group_org_calendar_idx" ON "payroll_pay_group" USING btree ("organization_id","calendar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_pay_group_org_code_uidx" ON "payroll_pay_group" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_pay_group_org_create_idempotency_uidx" ON "payroll_pay_group" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_payslip_org_id_idx" ON "payroll_payslip" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_period_org_id_idx" ON "payroll_period" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_period_org_pay_group_idx" ON "payroll_period" USING btree ("organization_id","pay_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_period_org_pay_group_range_uidx" ON "payroll_period" USING btree ("organization_id","pay_group_id","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_period_org_create_idempotency_uidx" ON "payroll_period" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_reconciliation_org_id_idx" ON "payroll_reconciliation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_recurring_deduction_org_id_idx" ON "payroll_recurring_deduction" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_recurring_deduction_org_assignment_idx" ON "payroll_recurring_deduction" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_recurring_deduction_org_id_uidx" ON "payroll_recurring_deduction" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_recurring_deduction_org_create_idempotency_uidx" ON "payroll_recurring_deduction" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_recurring_earning_org_id_idx" ON "payroll_recurring_earning" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_recurring_earning_org_assignment_idx" ON "payroll_recurring_earning" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_recurring_earning_org_id_uidx" ON "payroll_recurring_earning" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_recurring_earning_org_create_idempotency_uidx" ON "payroll_recurring_earning" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_result_line_org_id_idx" ON "payroll_result_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_result_line_org_run_idx" ON "payroll_result_line" USING btree ("organization_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_result_line_org_id_uidx" ON "payroll_result_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_result_line_org_run_employee_sequence_uidx" ON "payroll_result_line" USING btree ("organization_id","run_id","employee_id","sequence");--> statement-breakpoint
CREATE INDEX "payroll_rule_finalized_usage_org_rule_idx" ON "payroll_rule_finalized_usage" USING btree ("organization_id","rule_kind","rule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_rule_finalized_usage_org_rule_run_uidx" ON "payroll_rule_finalized_usage" USING btree ("organization_id","rule_kind","rule_id","run_id");--> statement-breakpoint
CREATE INDEX "payroll_run_org_id_idx" ON "payroll_run" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_run_org_status_idx" ON "payroll_run" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "payroll_run_org_pay_group_idx" ON "payroll_run" USING btree ("organization_id","pay_group_id");--> statement-breakpoint
CREATE INDEX "payroll_run_org_period_idx" ON "payroll_run" USING btree ("organization_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_org_identity_uidx" ON "payroll_run" USING btree ("organization_id","pay_group_id","period_id","run_type","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_org_create_idempotency_uidx" ON "payroll_run" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_run_employee_org_id_idx" ON "payroll_run_employee" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_run_employee_org_run_idx" ON "payroll_run_employee" USING btree ("organization_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_run_employee_org_run_employee_uidx" ON "payroll_run_employee" USING btree ("organization_id","run_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_statutory_result_org_id_idx" ON "payroll_statutory_result" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_statutory_result_org_run_idx" ON "payroll_statutory_result" USING btree ("organization_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_result_org_id_uidx" ON "payroll_statutory_result" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_result_org_run_employee_rule_uidx" ON "payroll_statutory_result" USING btree ("organization_id","run_id","employee_id","rule_code","rule_version");--> statement-breakpoint
CREATE INDEX "payroll_statutory_rule_org_id_idx" ON "payroll_statutory_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_statutory_rule_org_pay_group_idx" ON "payroll_statutory_rule" USING btree ("organization_id","pay_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_rule_org_id_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_rule_org_code_from_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","pay_group_id","code","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_statutory_rule_org_create_idempotency_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "payroll_variable_input_org_id_idx" ON "payroll_variable_input" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_variable_input_org_period_idx" ON "payroll_variable_input" USING btree ("organization_id","period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_variable_input_org_id_uidx" ON "payroll_variable_input" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_variable_input_org_source_uidx" ON "payroll_variable_input" USING btree ("organization_id","source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_variable_input_org_create_idempotency_uidx" ON "payroll_variable_input" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_created_at_idx" ON "platform_audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_entity_idx" ON "platform_audit_log" USING btree ("organization_id","entity","entity_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_actor_idx" ON "platform_audit_log" USING btree ("organization_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_action_idx" ON "platform_audit_log" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_module_idx" ON "platform_audit_log" USING btree ("organization_id","module");--> statement-breakpoint
CREATE INDEX "platform_domain_event_org_created_at_idx" ON "platform_domain_event" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_status_created_at_idx" ON "platform_domain_event" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_org_type_idx" ON "platform_domain_event" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_domain_event_org_source_type_dedupe_uidx" ON "platform_domain_event" USING btree ("organization_id","source_module","type","deduplication_key") WHERE "platform_domain_event"."deduplication_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "platform_notification_org_user_created_at_idx" ON "platform_notification" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_notification_org_user_unread_idx" ON "platform_notification" USING btree ("organization_id","user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_notification_org_user_module_dedupe_uidx" ON "platform_notification" USING btree ("organization_id","user_id","module","deduplication_key") WHERE "platform_notification"."deduplication_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_role_assignment_active_natural_key_uidx" ON "platform_role_assignment" USING btree ("user_id","organization_id","role_id","scope_type","scope_id") WHERE "platform_role_assignment"."active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_search_document_org_entity_doc_uidx" ON "platform_search_document" USING btree ("organization_id","entity","document_id");--> statement-breakpoint
CREATE INDEX "platform_search_document_org_entity_idx" ON "platform_search_document" USING btree ("organization_id","entity");--> statement-breakpoint
CREATE INDEX "platform_search_document_search_vector_gin_idx" ON "platform_search_document" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "purchase_order_org_id_idx" ON "purchase_order" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "purchase_order_org_status_idx" ON "purchase_order" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "purchase_order_org_party_idx" ON "purchase_order" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "purchase_order_org_updated_at_idx" ON "purchase_order" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_org_normalized_code_uidx" ON "purchase_order" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_org_create_idempotency_uidx" ON "purchase_order" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_id_idx" ON "purchase_order_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_order_idx" ON "purchase_order_line" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_item_idx" ON "purchase_order_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_line_org_order_line_no_uidx" ON "purchase_order_line" USING btree ("organization_id","order_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_line_org_order_idempotency_uidx" ON "purchase_order_line" USING btree ("organization_id","order_id","line_idempotency_key");--> statement-breakpoint
CREATE INDEX "customer_allocation_org_id_idx" ON "customer_allocation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "customer_allocation_org_customer_idx" ON "customer_allocation" USING btree ("organization_id","customer_party_id");--> statement-breakpoint
CREATE INDEX "customer_allocation_org_invoice_idx" ON "customer_allocation" USING btree ("organization_id","sales_invoice_id");--> statement-breakpoint
CREATE INDEX "customer_allocation_org_credit_note_idx" ON "customer_allocation" USING btree ("organization_id","credit_note_id");--> statement-breakpoint
CREATE INDEX "customer_balance_projection_org_id_idx" ON "customer_balance_projection" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_balance_projection_org_customer_currency_uidx" ON "customer_balance_projection" USING btree ("organization_id","customer_party_id","currency_code");--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_id_idx" ON "sales_credit_note" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_status_idx" ON "sales_credit_note" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_customer_idx" ON "sales_credit_note" USING btree ("organization_id","customer_party_id");--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_invoice_idx" ON "sales_credit_note" USING btree ("organization_id","sales_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_credit_note_org_normalized_code_uidx" ON "sales_credit_note" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "sales_invoice_org_id_idx" ON "sales_invoice" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "sales_invoice_org_status_idx" ON "sales_invoice" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "sales_invoice_org_customer_idx" ON "sales_invoice" USING btree ("organization_id","customer_party_id");--> statement-breakpoint
CREATE INDEX "sales_invoice_org_sales_order_idx" ON "sales_invoice" USING btree ("organization_id","sales_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoice_org_normalized_code_uidx" ON "sales_invoice" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_id_idx" ON "sales_invoice_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_invoice_idx" ON "sales_invoice_line" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_item_idx" ON "sales_invoice_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoice_line_org_invoice_line_no_uidx" ON "sales_invoice_line" USING btree ("organization_id","invoice_id","line_no");--> statement-breakpoint
CREATE INDEX "goods_receipt_org_id_idx" ON "goods_receipt" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "goods_receipt_org_status_idx" ON "goods_receipt" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "goods_receipt_org_source_idx" ON "goods_receipt" USING btree ("organization_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_org_inventory_status_idx" ON "goods_receipt" USING btree ("organization_id","inventory_application_status");--> statement-breakpoint
CREATE UNIQUE INDEX "goods_receipt_org_normalized_code_uidx" ON "goods_receipt" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_id_idx" ON "goods_receipt_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_receipt_idx" ON "goods_receipt_line" USING btree ("organization_id","goods_receipt_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_item_idx" ON "goods_receipt_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_po_line_idx" ON "goods_receipt_line" USING btree ("organization_id","purchase_order_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goods_receipt_line_org_receipt_line_no_uidx" ON "goods_receipt_line" USING btree ("organization_id","goods_receipt_id","line_no");--> statement-breakpoint
CREATE INDEX "receiving_discrepancy_org_receipt_idx" ON "receiving_discrepancy" USING btree ("organization_id","goods_receipt_id");--> statement-breakpoint
CREATE INDEX "sales_order_org_id_idx" ON "sales_order" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "sales_order_org_status_idx" ON "sales_order" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "sales_order_org_party_idx" ON "sales_order" USING btree ("organization_id","party_id");--> statement-breakpoint
CREATE INDEX "sales_order_org_updated_at_idx" ON "sales_order" USING btree ("organization_id","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_org_normalized_code_uidx" ON "sales_order" USING btree ("organization_id","normalized_code");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_org_create_idempotency_uidx" ON "sales_order" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "sales_order_line_org_id_idx" ON "sales_order_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "sales_order_line_org_order_idx" ON "sales_order_line" USING btree ("organization_id","order_id");--> statement-breakpoint
CREATE INDEX "sales_order_line_org_item_idx" ON "sales_order_line" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_line_org_order_line_no_uidx" ON "sales_order_line" USING btree ("organization_id","order_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_line_org_order_idempotency_uidx" ON "sales_order_line" USING btree ("organization_id","order_id","line_idempotency_key");