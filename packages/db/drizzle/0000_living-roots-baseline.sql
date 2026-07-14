-- ARCH-028 S2.2 baseline from Drizzle schema (Living roots + platform_*).
-- Live branch br-tiny-hill-ao82jp6f already has these tables (Collapse left no db/migrations/).
-- Do NOT run db:migrate against that branch for this file — use as journal baseline for forward diffs only.
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
	"actor_user_id" text,
	"organization_id" text,
	"target_type" text,
	"target_id" text,
	"role_id" uuid,
	"permission_code" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
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
CREATE TABLE "client_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"client_email" text NOT NULL,
	"assigned_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"confirmation_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draft_answers" jsonb,
	"draft_step_index" integer,
	"draft_saved_at" timestamp with time zone,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_name" text,
	"jurisdiction" text,
	"organization_id" text NOT NULL,
	CONSTRAINT "client_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone" text,
	"entity_name" text,
	"jurisdiction" text,
	"notes" text,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_legal_name" text,
	"nationality" text,
	"country_of_residence" text,
	"additional_residence_countries" text[] DEFAULT '{}',
	"passport_issuing_country" text,
	"passport_number" text,
	"identity_consent_at" timestamp with time zone,
	"portal_ack_at" timestamp with time zone,
	"portal_ack_version" text,
	"account_email" text,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference_number" text,
	"case_number" text,
	"effective_date" date,
	"submit_before" timestamp with time zone,
	"surveyor_name" text,
	"surveyor_org" text,
	"surveyee_individual" text,
	"surveyee_org" text,
	"purpose" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "surveys_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "fft_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_code" text NOT NULL,
	"event_name" text NOT NULL,
	"event_type" text DEFAULT 'hot_sales' NOT NULL,
	"description_en" text,
	"description_vi" text,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_location" text,
	"allocation_method" text DEFAULT 'priority_fcfs' NOT NULL,
	"standalone_program" boolean DEFAULT true NOT NULL,
	"combination_allowed" boolean DEFAULT false NOT NULL,
	"transfer_allowed" boolean DEFAULT true NOT NULL,
	"deposit_required" boolean DEFAULT false NOT NULL,
	"deposit_refundable" boolean DEFAULT false NOT NULL,
	"support_type" text DEFAULT 'fixed_per_unit' NOT NULL,
	"support_amount_per_unit" numeric,
	"support_unit_label" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"cloned_from_id" uuid,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fft_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"template_key" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "fft_role_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE "fft_role_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" text,
	"role_id" uuid NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fft_sales_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "fft_sales_member_email_unique" UNIQUE("email")
);
