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
CREATE INDEX "md_import_batch_org_id_idx" ON "md_import_batch" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_import_batch_org_idempotency_uidx" ON "md_import_batch" USING btree ("organization_id","idempotency_key");
