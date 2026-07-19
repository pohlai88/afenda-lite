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
CREATE INDEX "platform_notification_org_user_created_at_idx" ON "platform_notification" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_notification_org_user_unread_idx" ON "platform_notification" USING btree ("organization_id","user_id","read");
