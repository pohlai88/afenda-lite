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
	"net_days" integer,
	"warehouse_id" uuid,
	"warehouse_code" text,
	"warehouse_name" text,
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
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_party_id_md_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_payment_term_id_md_payment_term_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."md_payment_term"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_order_id_purchase_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "purchase_order_org_id_idx" ON "purchase_order" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "purchase_order_org_status_idx" ON "purchase_order" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "purchase_order_org_party_idx" ON "purchase_order" USING btree ("organization_id","party_id");
--> statement-breakpoint
CREATE INDEX "purchase_order_org_updated_at_idx" ON "purchase_order" USING btree ("organization_id","updated_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_org_normalized_code_uidx" ON "purchase_order" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_id_idx" ON "purchase_order_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_order_idx" ON "purchase_order_line" USING btree ("organization_id","order_id");
--> statement-breakpoint
CREATE INDEX "purchase_order_line_org_item_idx" ON "purchase_order_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_line_org_order_line_no_uidx" ON "purchase_order_line" USING btree ("organization_id","order_id","line_no");
