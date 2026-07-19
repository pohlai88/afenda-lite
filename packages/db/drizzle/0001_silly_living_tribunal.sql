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
CREATE INDEX "platform_audit_log_org_created_at_idx" ON "platform_audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_entity_idx" ON "platform_audit_log" USING btree ("organization_id","entity","entity_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_actor_idx" ON "platform_audit_log" USING btree ("organization_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_action_idx" ON "platform_audit_log" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "platform_audit_log_org_module_idx" ON "platform_audit_log" USING btree ("organization_id","module");