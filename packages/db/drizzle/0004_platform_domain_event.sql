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
CREATE INDEX "platform_domain_event_org_created_at_idx" ON "platform_domain_event" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_status_created_at_idx" ON "platform_domain_event" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "platform_domain_event_org_type_idx" ON "platform_domain_event" USING btree ("organization_id","type");