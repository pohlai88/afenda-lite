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
CREATE INDEX "md_change_request_org_id_idx" ON "md_change_request" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "md_change_request_org_status_idx" ON "md_change_request" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_change_request_org_normalized_code_uidx" ON "md_change_request" USING btree ("organization_id","normalized_code");
