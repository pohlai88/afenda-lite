CREATE TABLE "goods_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goods_receipt_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity_ordered" text,
	"quantity_received" text NOT NULL,
	"purchase_order_line_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receiving_discrepancy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"goods_receipt_id" uuid NOT NULL,
	"goods_receipt_line_id" uuid,
	"discrepancy_type" text NOT NULL,
	"quantity" text NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goods_receipt" ADD CONSTRAINT "goods_receipt_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receiving_discrepancy" ADD CONSTRAINT "receiving_discrepancy_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "receiving_discrepancy" ADD CONSTRAINT "receiving_discrepancy_goods_receipt_line_id_goods_receipt_line_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "goods_receipt_org_id_idx" ON "goods_receipt" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "goods_receipt_org_status_idx" ON "goods_receipt" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "goods_receipt_org_source_idx" ON "goods_receipt" USING btree ("organization_id","source_type","source_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "goods_receipt_org_normalized_code_uidx" ON "goods_receipt" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_id_idx" ON "goods_receipt_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_receipt_idx" ON "goods_receipt_line" USING btree ("organization_id","goods_receipt_id");
--> statement-breakpoint
CREATE INDEX "goods_receipt_line_org_item_idx" ON "goods_receipt_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "goods_receipt_line_org_receipt_line_no_uidx" ON "goods_receipt_line" USING btree ("organization_id","goods_receipt_id","line_no");
--> statement-breakpoint
CREATE INDEX "receiving_discrepancy_org_receipt_idx" ON "receiving_discrepancy" USING btree ("organization_id","goods_receipt_id");
