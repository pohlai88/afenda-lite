CREATE TABLE IF NOT EXISTS "platform_work_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"target_user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"title" text NOT NULL,
	"priority" text NOT NULL,
	"due_on" date,
	"source_event_id" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"fact_version" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"correlation_id" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_work_item_kind_check" CHECK ("kind" IN ('approval', 'task', 'reminder', 'escalation')),
	CONSTRAINT "platform_work_item_status_check" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled')),
	CONSTRAINT "platform_work_item_kind_status_check" CHECK (("kind" = 'approval' AND "status" IN ('pending', 'approved', 'rejected', 'cancelled')) OR ("kind" = 'task' AND "status" IN ('pending', 'in_progress', 'completed', 'cancelled')) OR ("kind" = 'reminder' AND "status" IN ('pending', 'completed', 'dismissed', 'cancelled')) OR ("kind" = 'escalation' AND "status" IN ('pending', 'in_progress', 'completed', 'cancelled'))),
	CONSTRAINT "platform_work_item_version_check" CHECK ("version" > 0),
	CONSTRAINT "platform_work_item_fact_version_check" CHECK ("fact_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_work_item_org_dedupe_uidx" ON "platform_work_item" USING btree ("organization_id", "deduplication_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_work_item_org_id_uidx" ON "platform_work_item" USING btree ("organization_id", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_work_item_org_target_status_idx" ON "platform_work_item" USING btree ("organization_id", "target_user_id", "status", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_work_item_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"work_item_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"resulting_version" integer NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_work_item_activity_org_item_fk" FOREIGN KEY ("organization_id", "work_item_id") REFERENCES "public"."platform_work_item"("organization_id", "id"),
	CONSTRAINT "platform_work_item_activity_status_check" CHECK ("to_status" IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled') AND ("from_status" IS NULL OR "from_status" IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled'))),
	CONSTRAINT "platform_work_item_activity_action_check" CHECK ("action" IN ('recorded', 'transitioned')),
	CONSTRAINT "platform_work_item_activity_version_check" CHECK ("resulting_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_work_item_activity_org_item_version_uidx" ON "platform_work_item_activity" USING btree ("organization_id", "work_item_id", "resulting_version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_work_item_activity_org_created_idx" ON "platform_work_item_activity" USING btree ("organization_id", "created_at");
