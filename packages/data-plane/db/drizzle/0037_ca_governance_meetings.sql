CREATE TABLE "ca_governance_meeting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_body_id" uuid NOT NULL,
	"procedure_type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"title" text NOT NULL,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone,
	"notice_period_days" integer NOT NULL,
	"location_summary" text,
	"remote_access_summary" text,
	"source_document_id" text NOT NULL,
	"opened_at" timestamp with time zone,
	"adjourned_at" timestamp with time zone,
	"adjourned_to" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"no_quorum_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_governance_meeting_procedure_type_check" CHECK ("procedure_type" IN ('physical', 'virtual', 'hybrid', 'written_resolution')),
	CONSTRAINT "ca_governance_meeting_status_check" CHECK ("status" IN ('scheduled', 'open', 'adjourned', 'closed', 'cancelled')),
	CONSTRAINT "ca_governance_meeting_time_check" CHECK ("scheduled_end_at" IS NULL OR "scheduled_start_at" < "scheduled_end_at"),
	CONSTRAINT "ca_governance_meeting_notice_period_check" CHECK ("notice_period_days" >= 0),
	CONSTRAINT "ca_governance_meeting_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_governance_meeting_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_governance_meeting_org_company_id_uidx" ON "ca_governance_meeting" USING btree ("organization_id","legal_company_id","id");
CREATE INDEX "ca_governance_meeting_body_time_idx" ON "ca_governance_meeting" USING btree ("organization_id","legal_company_id","governance_body_id","scheduled_start_at");

CREATE TABLE "ca_meeting_notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid NOT NULL,
	"recipient_membership_id" uuid,
	"recipient_party_id" text,
	"status" text DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone,
	"waived_at" timestamp with time zone,
	"delivery_method" text NOT NULL,
	"waiver_reason" text,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_meeting_notice_recipient_check" CHECK ("recipient_membership_id" IS NOT NULL OR "recipient_party_id" IS NOT NULL),
	CONSTRAINT "ca_meeting_notice_status_check" CHECK ("status" IN ('issued', 'delivered', 'waived')),
	CONSTRAINT "ca_meeting_notice_delivery_check" CHECK (("status" <> 'delivered' OR ("delivered_at" IS NOT NULL AND "waived_at" IS NULL))),
	CONSTRAINT "ca_meeting_notice_waiver_check" CHECK (("status" <> 'waived' OR ("waived_at" IS NOT NULL AND "waiver_reason" IS NOT NULL))),
	CONSTRAINT "ca_meeting_notice_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_meeting_notice_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_meeting_notice_org_company_id_uidx" ON "ca_meeting_notice" USING btree ("organization_id","legal_company_id","id");
CREATE INDEX "ca_meeting_notice_meeting_idx" ON "ca_meeting_notice" USING btree ("organization_id","governance_meeting_id","status");

CREATE TABLE "ca_meeting_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid NOT NULL,
	"governance_membership_id" uuid NOT NULL,
	"participant_party_id" text,
	"attendance_status" text NOT NULL,
	"represented_by_party_id" text,
	"proxy_document_id" text,
	"recusal_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_meeting_participant_attendance_check" CHECK ("attendance_status" IN ('present', 'absent', 'represented', 'recused')),
	CONSTRAINT "ca_meeting_participant_proxy_check" CHECK ("attendance_status" <> 'represented' OR ("represented_by_party_id" IS NOT NULL AND "proxy_document_id" IS NOT NULL)),
	CONSTRAINT "ca_meeting_participant_recusal_check" CHECK ("attendance_status" <> 'recused' OR "recusal_reason" IS NOT NULL),
	CONSTRAINT "ca_meeting_participant_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_meeting_participant_org_meeting_member_uidx" ON "ca_meeting_participant" USING btree ("organization_id","governance_meeting_id","governance_membership_id");
CREATE INDEX "ca_meeting_participant_meeting_idx" ON "ca_meeting_participant" USING btree ("organization_id","governance_meeting_id","attendance_status");

CREATE TABLE "ca_meeting_quorum_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid NOT NULL,
	"rule_snapshot" jsonb NOT NULL,
	"eligible_member_count" integer NOT NULL,
	"present_member_count" integer NOT NULL,
	"required_present_count" integer NOT NULL,
	"has_quorum" boolean NOT NULL,
	"no_quorum_reason" text,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_meeting_quorum_result_counts_check" CHECK ("eligible_member_count" >= 0 AND "present_member_count" >= 0 AND "required_present_count" > 0),
	CONSTRAINT "ca_meeting_quorum_result_truth_check" CHECK ("has_quorum" = ("present_member_count" >= "required_present_count")),
	CONSTRAINT "ca_meeting_quorum_result_reason_check" CHECK ("has_quorum" OR "no_quorum_reason" IS NOT NULL),
	CONSTRAINT "ca_meeting_quorum_result_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_meeting_quorum_result_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_meeting_quorum_result_org_company_id_uidx" ON "ca_meeting_quorum_result" USING btree ("organization_id","legal_company_id","id");
CREATE INDEX "ca_meeting_quorum_result_meeting_idx" ON "ca_meeting_quorum_result" USING btree ("organization_id","governance_meeting_id","recorded_at");
