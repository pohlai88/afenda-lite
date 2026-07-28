CREATE TABLE "ca_meeting_vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid NOT NULL,
	"motion_code" text NOT NULL,
	"eligible_votes" integer NOT NULL,
	"votes_for" integer NOT NULL,
	"votes_against" integer NOT NULL,
	"abstentions" integer NOT NULL,
	"threshold_type" text NOT NULL,
	"required_for" integer NOT NULL,
	"outcome" text NOT NULL,
	"outcome_basis" text NOT NULL,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_meeting_vote_counts_check" CHECK ("eligible_votes" > 0 AND "votes_for" >= 0 AND "votes_against" >= 0 AND "abstentions" >= 0 AND ("votes_for" + "votes_against" + "abstentions") <= "eligible_votes"),
	CONSTRAINT "ca_meeting_vote_threshold_check" CHECK ("threshold_type" IN ('simple_majority', 'supermajority', 'unanimous', 'custom')),
	CONSTRAINT "ca_meeting_vote_required_check" CHECK ("required_for" > 0 AND "required_for" <= "eligible_votes"),
	CONSTRAINT "ca_meeting_vote_outcome_check" CHECK ("outcome" IN ('adopted', 'rejected')),
	CONSTRAINT "ca_meeting_vote_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_meeting_vote_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_meeting_vote_org_meeting_motion_uidx" ON "ca_meeting_vote" USING btree ("organization_id","governance_meeting_id","motion_code");
CREATE INDEX "ca_meeting_vote_company_outcome_idx" ON "ca_meeting_vote" USING btree ("organization_id","legal_company_id","outcome");

CREATE TABLE "ca_resolution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"governance_meeting_id" uuid,
	"meeting_vote_id" uuid,
	"approval_basis" text NOT NULL,
	"status" text NOT NULL,
	"resolution_code" text NOT NULL,
	"title" text NOT NULL,
	"text_digest" text NOT NULL,
	"document_id" text NOT NULL,
	"minutes_document_id" text,
	"effective_from" date NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"superseded_by_resolution_id" uuid,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_resolution_approval_basis_check" CHECK ("approval_basis" IN ('meeting_vote', 'written_resolution')),
	CONSTRAINT "ca_resolution_status_check" CHECK ("status" IN ('adopted', 'rejected', 'superseded')),
	CONSTRAINT "ca_resolution_vote_basis_check" CHECK (("approval_basis" = 'meeting_vote' AND "meeting_vote_id" IS NOT NULL) OR ("approval_basis" = 'written_resolution' AND "meeting_vote_id" IS NULL)),
	CONSTRAINT "ca_resolution_decision_check" CHECK (("status" IN ('adopted', 'superseded') AND "approved_at" IS NOT NULL AND "rejected_at" IS NULL) OR ("status" = 'rejected' AND "rejected_at" IS NOT NULL AND "approved_at" IS NULL)),
	CONSTRAINT "ca_resolution_supersession_check" CHECK (("status" = 'superseded' AND "superseded_at" IS NOT NULL AND "superseded_by_resolution_id" IS NOT NULL) OR ("status" <> 'superseded' AND "superseded_at" IS NULL AND "superseded_by_resolution_id" IS NULL)),
	CONSTRAINT "ca_resolution_digest_check" CHECK (char_length(btrim("text_digest")) >= 32),
	CONSTRAINT "ca_resolution_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_resolution_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_resolution_org_company_code_uidx" ON "ca_resolution" USING btree ("organization_id","legal_company_id","resolution_code");
CREATE INDEX "ca_resolution_company_status_idx" ON "ca_resolution" USING btree ("organization_id","legal_company_id","status","effective_from");
CREATE INDEX "ca_resolution_vote_idx" ON "ca_resolution" USING btree ("organization_id","meeting_vote_id");

CREATE TABLE "ca_resolution_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"legal_company_id" uuid NOT NULL,
	"resolution_id" uuid NOT NULL,
	"action_type_code" text NOT NULL,
	"assignee_party_id" text NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"due_on" date NOT NULL,
	"completed_at" timestamp with time zone,
	"evidence_document_id" text,
	"completion_notes" text,
	"source_document_id" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ca_resolution_action_status_check" CHECK ("status" IN ('assigned', 'completed', 'cancelled')),
	CONSTRAINT "ca_resolution_action_completion_check" CHECK (("status" = 'completed' AND "completed_at" IS NOT NULL AND "evidence_document_id" IS NOT NULL) OR ("status" <> 'completed' AND "completed_at" IS NULL AND "evidence_document_id" IS NULL)),
	CONSTRAINT "ca_resolution_action_source_check" CHECK (char_length(btrim("source_document_id")) > 0),
	CONSTRAINT "ca_resolution_action_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "ca_resolution_action_org_resolution_type_uidx" ON "ca_resolution_action" USING btree ("organization_id","resolution_id","action_type_code");
CREATE INDEX "ca_resolution_action_due_idx" ON "ca_resolution_action" USING btree ("organization_id","status","due_on");
