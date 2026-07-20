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
CREATE INDEX "md_payment_term_org_id_idx" ON "md_payment_term" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "md_payment_term_org_status_idx" ON "md_payment_term" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "md_payment_term_org_updated_at_idx" ON "md_payment_term" USING btree ("organization_id","updated_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_payment_term_org_normalized_code_live_uidx" ON "md_payment_term" USING btree ("organization_id","normalized_code") WHERE "md_payment_term"."retired_at" IS NULL;
