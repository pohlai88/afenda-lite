CREATE TABLE "delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sales_order_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"ship_to_party_id" uuid,
	"ship_to_party_code" text,
	"ship_to_party_name" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"delivered_at" timestamp with time zone,
	"delivered_by" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity_ordered" text,
	"quantity_to_deliver" text NOT NULL,
	"sales_order_line_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_pick" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"delivery_line_id" uuid,
	"quantity_picked" text NOT NULL,
	"picked_at" timestamp with time zone NOT NULL,
	"picked_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"package_code" text,
	"notes" text,
	"packed_at" timestamp with time zone NOT NULL,
	"packed_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_of_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"delivery_id" uuid NOT NULL,
	"received_by_name" text NOT NULL,
	"notes" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_line" ADD CONSTRAINT "delivery_line_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_line" ADD CONSTRAINT "delivery_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_pick" ADD CONSTRAINT "delivery_pick_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_pick" ADD CONSTRAINT "delivery_pick_delivery_line_id_delivery_line_id_fk" FOREIGN KEY ("delivery_line_id") REFERENCES "public"."delivery_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_pack" ADD CONSTRAINT "delivery_pack_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "proof_of_delivery" ADD CONSTRAINT "proof_of_delivery_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "delivery_org_id_idx" ON "delivery" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "delivery_org_status_idx" ON "delivery" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "delivery_org_sales_order_idx" ON "delivery" USING btree ("organization_id","sales_order_id");
--> statement-breakpoint
CREATE INDEX "delivery_org_warehouse_idx" ON "delivery" USING btree ("organization_id","warehouse_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_org_normalized_code_uidx" ON "delivery" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "delivery_line_org_id_idx" ON "delivery_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "delivery_line_org_delivery_idx" ON "delivery_line" USING btree ("organization_id","delivery_id");
--> statement-breakpoint
CREATE INDEX "delivery_line_org_item_idx" ON "delivery_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_line_org_delivery_line_no_uidx" ON "delivery_line" USING btree ("organization_id","delivery_id","line_no");
--> statement-breakpoint
CREATE INDEX "delivery_pick_org_delivery_idx" ON "delivery_pick" USING btree ("organization_id","delivery_id");
--> statement-breakpoint
CREATE INDEX "delivery_pack_org_delivery_idx" ON "delivery_pack" USING btree ("organization_id","delivery_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "proof_of_delivery_org_delivery_uidx" ON "proof_of_delivery" USING btree ("organization_id","delivery_id");
