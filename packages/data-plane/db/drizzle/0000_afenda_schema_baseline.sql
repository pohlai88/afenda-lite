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
CREATE TABLE "hr_benefit_eligibility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
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
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "hr_compensation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	CONSTRAINT "hr_competency_assessment_status_check" CHECK ("hr_competency_assessment"."status" IN ('current', 'superseded')),
	CONSTRAINT "hr_competency_assessment_scale_code_check" CHECK ("hr_competency_assessment"."scale_code" IN ('five_point', 'behavioral_anchor')),
	CONSTRAINT "hr_competency_assessment_level_check" CHECK ("hr_competency_assessment"."level" >= 1 AND "hr_competency_assessment"."level" <= 5)
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_document_requirement_status_check" CHECK ("hr_document_requirement"."status" IN ('draft', 'published', 'retired'))
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"effective_from" date NOT NULL,
	"effective_to" date,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"source_review_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"evaluator_actor_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "hr_job_requisition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"job_id" uuid,
	"position_id" uuid,
	"department_id" uuid,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	CONSTRAINT "hr_learning_course_status_check" CHECK ("hr_learning_course"."status" IN ('active', 'archived'))
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
	CONSTRAINT "hr_leave_adjustment_kind_check" CHECK ("hr_leave_adjustment"."kind" IN ('manual', 'carry_forward', 'expiry', 'consumption', 'cancellation_reversal')),
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
	CONSTRAINT "hr_leave_policy_date_range_check" CHECK ("hr_leave_policy"."effective_to" IS NULL OR "hr_leave_policy"."effective_to" >= "hr_leave_policy"."effective_from")
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
CREATE TABLE "hr_performance_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"rating" text,
	"comments_sensitive" text,
	"submitted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_assessment_kind_check" CHECK ("hr_performance_assessment"."kind" IN ('self', 'manager'))
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
	CONSTRAINT "hr_performance_cycle_status_check" CHECK ("hr_performance_cycle"."status" IN ('draft', 'open', 'closed', 'cancelled')),
	CONSTRAINT "hr_performance_cycle_weighting_model_check" CHECK ("hr_performance_cycle"."weighting_model" IN ('none', 'percent100')),
	CONSTRAINT "hr_performance_cycle_period_range_check" CHECK ("hr_performance_cycle"."period_end" >= "hr_performance_cycle"."period_start")
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
	"status" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_goal_status_check" CHECK ("hr_performance_goal"."status" IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed', 'cancelled')),
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
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_performance_review_participant_role_check" CHECK ("hr_performance_review_participant"."role" IN ('self', 'manager', 'delegated'))
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
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "hr_termination" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason_code" text NOT NULL,
	"reason_detail" text NOT NULL,
	"effective_on" date NOT NULL,
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
CREATE TABLE "hr_work_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"employment_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_deduction_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_earning_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_employee_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_pay_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_recurring_earning" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_result_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_run_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_statutory_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_statutory_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_variable_input" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment" ADD CONSTRAINT "hr_benefit_enrollment_plan_id_hr_benefit_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hr_benefit_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_candidate_id_hr_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hr_candidate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_candidate_application" ADD CONSTRAINT "hr_candidate_application_requisition_id_hr_job_requisition_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."hr_job_requisition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan" ADD CONSTRAINT "hr_career_plan_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan_action" ADD CONSTRAINT "hr_career_plan_action_career_plan_id_hr_career_plan_id_fk" FOREIGN KEY ("career_plan_id") REFERENCES "public"."hr_career_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_career_plan_action" ADD CONSTRAINT "hr_career_plan_action_learning_assignment_id_hr_learning_assignment_id_fk" FOREIGN KEY ("learning_assignment_id") REFERENCES "public"."hr_learning_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_offboarding_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("offboarding_case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_clearance" ADD CONSTRAINT "hr_clearance_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "hr_employee_case" ADD CONSTRAINT "hr_employee_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case" ADD CONSTRAINT "hr_employee_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_action" ADD CONSTRAINT "hr_employee_case_action_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_appeal" ADD CONSTRAINT "hr_employee_case_appeal_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_case_event" ADD CONSTRAINT "hr_employee_case_event_case_id_hr_employee_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_employee_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_certification" ADD CONSTRAINT "hr_employee_certification_completion_id_hr_learning_completion_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."hr_learning_completion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_compensation" ADD CONSTRAINT "hr_employee_compensation_salary_band_id_hr_salary_band_id_fk" FOREIGN KEY ("salary_band_id") REFERENCES "public"."hr_salary_band"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_document" ADD CONSTRAINT "hr_employee_document_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_document" ADD CONSTRAINT "hr_employee_document_requirement_id_hr_document_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."hr_document_requirement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment" ADD CONSTRAINT "hr_employment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_confirmation" ADD CONSTRAINT "hr_employment_confirmation_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_contract" ADD CONSTRAINT "hr_employment_contract_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("from_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_assignment_id_hr_work_assignment_id_fk" FOREIGN KEY ("to_assignment_id") REFERENCES "public"."hr_work_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_from_position_id_hr_position_id_fk" FOREIGN KEY ("from_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_movement" ADD CONSTRAINT "hr_employment_movement_to_position_id_hr_position_id_fk" FOREIGN KEY ("to_position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employment_offer" ADD CONSTRAINT "hr_employment_offer_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "hr_interview" ADD CONSTRAINT "hr_interview_application_id_hr_candidate_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."hr_candidate_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_interview_evaluation" ADD CONSTRAINT "hr_interview_evaluation_interview_id_hr_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."hr_interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_competency" ADD CONSTRAINT "hr_job_competency_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_competency" ADD CONSTRAINT "hr_job_competency_competency_id_hr_competency_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."hr_competency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_course_id_hr_learning_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hr_learning_course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_learning_assignment" ADD CONSTRAINT "hr_learning_assignment_session_id_hr_learning_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hr_learning_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_case" ADD CONSTRAINT "hr_offboarding_case_termination_id_hr_termination_id_fk" FOREIGN KEY ("termination_id") REFERENCES "public"."hr_termination"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_offboarding_task" ADD CONSTRAINT "hr_offboarding_task_case_id_hr_offboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_offboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_case" ADD CONSTRAINT "hr_onboarding_case_source_offer_id_hr_employment_offer_id_fk" FOREIGN KEY ("source_offer_id") REFERENCES "public"."hr_employment_offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_onboarding_task" ADD CONSTRAINT "hr_onboarding_task_case_id_hr_onboarding_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."hr_onboarding_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_assessment" ADD CONSTRAINT "hr_performance_assessment_review_id_hr_performance_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hr_performance_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_cycle_participant" ADD CONSTRAINT "hr_performance_cycle_participant_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_cycle_id_hr_performance_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_goal" ADD CONSTRAINT "hr_performance_goal_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "hr_policy_acknowledgement" ADD CONSTRAINT "hr_policy_acknowledgement_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_policy_acknowledgement" ADD CONSTRAINT "hr_policy_acknowledgement_supersedes_acknowledgement_id_hr_policy_acknowledgement_id_fk" FOREIGN KEY ("supersedes_acknowledgement_id") REFERENCES "public"."hr_policy_acknowledgement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_department_id_hr_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hr_department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_position" ADD CONSTRAINT "hr_position_job_id_hr_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."hr_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_probation_review" ADD CONSTRAINT "hr_probation_review_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_salary_band" ADD CONSTRAINT "hr_salary_band_grade_id_hr_compensation_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."hr_compensation_grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_candidate" ADD CONSTRAINT "hr_succession_candidate_succession_plan_id_hr_succession_plan_id_fk" FOREIGN KEY ("succession_plan_id") REFERENCES "public"."hr_succession_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_candidate" ADD CONSTRAINT "hr_succession_candidate_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_succession_plan" ADD CONSTRAINT "hr_succession_plan_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_pool_member" ADD CONSTRAINT "hr_talent_pool_member_pool_id_hr_talent_pool_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."hr_talent_pool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_pool_member" ADD CONSTRAINT "hr_talent_pool_member_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_profile" ADD CONSTRAINT "hr_talent_profile_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_talent_profile_assessment" ADD CONSTRAINT "hr_talent_profile_assessment_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_termination" ADD CONSTRAINT "hr_termination_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employment_id_hr_employment_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."hr_employment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_work_eligibility" ADD CONSTRAINT "hr_work_eligibility_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "hr_benefit_eligibility_org_id_idx" ON "hr_benefit_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_id_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_employee_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_benefit_enrollment_org_plan_idx" ON "hr_benefit_enrollment" USING btree ("organization_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_employee_plan_active_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","employee_id","plan_id") WHERE "hr_benefit_enrollment"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_benefit_enrollment_org_create_idempotency_uidx" ON "hr_benefit_enrollment" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
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
CREATE INDEX "hr_compensation_review_org_id_idx" ON "hr_compensation_review" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employee_idx" ON "hr_compensation_review" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_org_employment_idx" ON "hr_compensation_review" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_compensation_review_org_create_idempotency_uidx" ON "hr_compensation_review" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_compensation_review_cycle_org_id_idx" ON "hr_compensation_review_cycle" USING btree ("organization_id","id");--> statement-breakpoint
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
CREATE INDEX "hr_employment_confirmation_org_id_idx" ON "hr_employment_confirmation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_employment_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_confirmation_org_create_idempotency_uidx" ON "hr_employment_confirmation" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_id_idx" ON "hr_employment_contract" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_contract_org_employment_idx" ON "hr_employment_contract" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_contract_org_employment_ref_uidx" ON "hr_employment_contract" USING btree ("organization_id","employment_id","reference_code");--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_id_idx" ON "hr_employment_movement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_movement_org_employment_idx" ON "hr_employment_movement" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_movement_org_create_idempotency_uidx" ON "hr_employment_movement" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_id_idx" ON "hr_employment_offer" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_employment_offer_org_status_idx" ON "hr_employment_offer" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_application_draft_issued_uidx" ON "hr_employment_offer" USING btree ("organization_id","application_id") WHERE "hr_employment_offer"."status" IN ('draft', 'issued');--> statement-breakpoint
CREATE UNIQUE INDEX "hr_employment_offer_org_accept_idempotency_uidx" ON "hr_employment_offer" USING btree ("organization_id","accept_idempotency_key") WHERE "hr_employment_offer"."accept_idempotency_key" IS NOT NULL;--> statement-breakpoint
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
CREATE INDEX "hr_offboarding_case_org_id_idx" ON "hr_offboarding_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_case_org_employment_idx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_employment_open_uidx" ON "hr_offboarding_case" USING btree ("organization_id","employment_id") WHERE "hr_offboarding_case"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_case_org_create_idempotency_uidx" ON "hr_offboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_id_idx" ON "hr_offboarding_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_offboarding_task_org_case_idx" ON "hr_offboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_offboarding_task_org_case_code_uidx" ON "hr_offboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_id_idx" ON "hr_onboarding_case" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_case_org_employment_idx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_employment_open_uidx" ON "hr_onboarding_case" USING btree ("organization_id","employment_id") WHERE "hr_onboarding_case"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_case_org_create_idempotency_uidx" ON "hr_onboarding_case" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_id_idx" ON "hr_onboarding_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_onboarding_task_org_case_idx" ON "hr_onboarding_task" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_onboarding_task_org_case_code_uidx" ON "hr_onboarding_task" USING btree ("organization_id","case_id","code");--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_id_idx" ON "hr_performance_assessment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_assessment_org_review_idx" ON "hr_performance_assessment" USING btree ("organization_id","review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_assessment_org_review_kind_uidx" ON "hr_performance_assessment" USING btree ("organization_id","review_id","kind");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_id_idx" ON "hr_performance_cycle" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_org_status_idx" ON "hr_performance_cycle" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_code_uidx" ON "hr_performance_cycle" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_org_create_idempotency_uidx" ON "hr_performance_cycle" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_id_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_cycle_participant_org_cycle_idx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_performance_cycle_participant_org_cycle_employment_active_uidx" ON "hr_performance_cycle_participant" USING btree ("organization_id","cycle_id","employment_id") WHERE "hr_performance_cycle_participant"."status" = 'active';--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_id_idx" ON "hr_performance_goal" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_cycle_idx" ON "hr_performance_goal" USING btree ("organization_id","cycle_id");--> statement-breakpoint
CREATE INDEX "hr_performance_goal_org_employee_idx" ON "hr_performance_goal" USING btree ("organization_id","employee_id");--> statement-breakpoint
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
CREATE INDEX "hr_policy_acknowledgement_org_id_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_employee_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_policy_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","policy_code","policy_version");--> statement-breakpoint
CREATE INDEX "hr_policy_acknowledgement_org_status_idx" ON "hr_policy_acknowledgement" USING btree ("organization_id","requirement_status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_policy_acknowledgement_org_create_idempotency_uidx" ON "hr_policy_acknowledgement" USING btree ("organization_id","create_idempotency_key") WHERE "hr_policy_acknowledgement"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_position_org_id_idx" ON "hr_position" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_position_org_status_idx" ON "hr_position" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_position_org_department_idx" ON "hr_position" USING btree ("organization_id","department_id");--> statement-breakpoint
CREATE INDEX "hr_position_org_job_idx" ON "hr_position" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_position_org_code_uidx" ON "hr_position" USING btree ("organization_id","code");--> statement-breakpoint
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
CREATE INDEX "hr_succession_candidate_org_id_idx" ON "hr_succession_candidate" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_succession_candidate_org_plan_idx" ON "hr_succession_candidate" USING btree ("organization_id","succession_plan_id");--> statement-breakpoint
CREATE INDEX "hr_succession_candidate_org_employee_idx" ON "hr_succession_candidate" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_candidate_org_create_idempotency_uidx" ON "hr_succession_candidate" USING btree ("organization_id","create_idempotency_key") WHERE "hr_succession_candidate"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "hr_succession_plan_org_id_idx" ON "hr_succession_plan" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_succession_plan_org_position_idx" ON "hr_succession_plan" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_plan_org_code_uidx" ON "hr_succession_plan" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_succession_plan_org_create_idempotency_uidx" ON "hr_succession_plan" USING btree ("organization_id","create_idempotency_key") WHERE "hr_succession_plan"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
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
CREATE INDEX "hr_termination_org_id_idx" ON "hr_termination" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_termination_org_employment_idx" ON "hr_termination" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_employment_finalized_uidx" ON "hr_termination" USING btree ("organization_id","employment_id") WHERE "hr_termination"."status" = 'finalized';--> statement-breakpoint
CREATE UNIQUE INDEX "hr_termination_org_create_idempotency_uidx" ON "hr_termination" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_id_idx" ON "hr_work_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_employment_idx" ON "hr_work_assignment" USING btree ("organization_id","employment_id");--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_position_idx" ON "hr_work_assignment" USING btree ("organization_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_assignment_org_employment_open_uidx" ON "hr_work_assignment" USING btree ("organization_id","employment_id") WHERE "hr_work_assignment"."ends_on" IS NULL;--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_id_idx" ON "hr_work_eligibility" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_employee_idx" ON "hr_work_eligibility" USING btree ("organization_id","employee_id");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_status_idx" ON "hr_work_eligibility" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "hr_work_eligibility_org_country_idx" ON "hr_work_eligibility" USING btree ("organization_id","country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_work_eligibility_org_create_idempotency_uidx" ON "hr_work_eligibility" USING btree ("organization_id","create_idempotency_key") WHERE "hr_work_eligibility"."create_idempotency_key" IS NOT NULL;--> statement-breakpoint
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
CREATE INDEX "payroll_deduction_rule_org_id_idx" ON "payroll_deduction_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_earning_rule_org_id_idx" ON "payroll_earning_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_employee_assignment_org_id_idx" ON "payroll_employee_assignment" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_exception_org_id_idx" ON "payroll_exception" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_pay_group_org_id_idx" ON "payroll_pay_group" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_payslip_org_id_idx" ON "payroll_payslip" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_period_org_id_idx" ON "payroll_period" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_reconciliation_org_id_idx" ON "payroll_reconciliation" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_recurring_deduction_org_id_idx" ON "payroll_recurring_deduction" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_recurring_earning_org_id_idx" ON "payroll_recurring_earning" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_result_line_org_id_idx" ON "payroll_result_line" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_run_org_id_idx" ON "payroll_run" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_run_employee_org_id_idx" ON "payroll_run_employee" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_statutory_result_org_id_idx" ON "payroll_statutory_result" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_statutory_rule_org_id_idx" ON "payroll_statutory_rule" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "payroll_variable_input_org_id_idx" ON "payroll_variable_input" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_created_at_idx" ON "platform_audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_entity_idx" ON "platform_audit_log" USING btree ("organization_id","entity","entity_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_actor_idx" ON "platform_audit_log" USING btree ("organization_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_action_idx" ON "platform_audit_log" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_module_idx" ON "platform_audit_log" USING btree ("organization_id","module");--> statement-breakpoint
CREATE INDEX "platform_domain_event_org_created_at_idx" ON "platform_domain_event" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_status_created_at_idx" ON "platform_domain_event" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_org_type_idx" ON "platform_domain_event" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "platform_notification_org_user_created_at_idx" ON "platform_notification" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_notification_org_user_unread_idx" ON "platform_notification" USING btree ("organization_id","user_id","read");--> statement-breakpoint
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