CREATE TABLE "stock_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"movement_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"warehouse_id" uuid,
	"warehouse_code" text,
	"warehouse_name" text,
	"from_warehouse_id" uuid,
	"from_warehouse_code" text,
	"from_warehouse_name" text,
	"to_warehouse_id" uuid,
	"to_warehouse_code" text,
	"to_warehouse_name" text,
	"reservation_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"movement_id" uuid NOT NULL,
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
CREATE TABLE "stock_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"on_hand" numeric(24, 12) DEFAULT '0' NOT NULL,
	"reserved" numeric(24, 12) DEFAULT '0' NOT NULL,
	"available" numeric(24, 12) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"movement_id" uuid NOT NULL,
	"movement_line_id" uuid,
	"movement_code" text NOT NULL,
	"movement_type" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"quantity_delta" numeric(24, 12) NOT NULL,
	"on_hand_after" numeric(24, 12) NOT NULL,
	"reserved_after" numeric(24, 12) NOT NULL,
	"available_after" numeric(24, 12) NOT NULL,
	"actor_user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"warehouse_code" text NOT NULL,
	"warehouse_name" text NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"base_uom_code" text NOT NULL,
	"quantity" numeric(24, 12) NOT NULL,
	"source_movement_id" uuid,
	"release_movement_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_from_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_to_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement_line" ADD CONSTRAINT "stock_movement_line_movement_id_stock_movement_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement_line" ADD CONSTRAINT "stock_movement_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_movement_id_stock_movement_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_movement_line_id_stock_movement_line_id_fk" FOREIGN KEY ("movement_line_id") REFERENCES "public"."stock_movement_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_warehouse_id_md_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."md_warehouse"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_source_movement_id_stock_movement_id_fk" FOREIGN KEY ("source_movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_release_movement_id_stock_movement_id_fk" FOREIGN KEY ("release_movement_id") REFERENCES "public"."stock_movement"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "stock_movement_org_id_idx" ON "stock_movement" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "stock_movement_org_status_idx" ON "stock_movement" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "stock_movement_org_type_idx" ON "stock_movement" USING btree ("organization_id","movement_type");
--> statement-breakpoint
CREATE INDEX "stock_movement_org_updated_at_idx" ON "stock_movement" USING btree ("organization_id","updated_at","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_org_normalized_code_uidx" ON "stock_movement" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_id_idx" ON "stock_movement_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_movement_idx" ON "stock_movement_line" USING btree ("organization_id","movement_id");
--> statement-breakpoint
CREATE INDEX "stock_movement_line_org_item_idx" ON "stock_movement_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movement_line_org_movement_line_no_uidx" ON "stock_movement_line" USING btree ("organization_id","movement_id","line_no");
--> statement-breakpoint
CREATE INDEX "stock_balance_org_id_idx" ON "stock_balance" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "stock_balance_org_warehouse_idx" ON "stock_balance" USING btree ("organization_id","warehouse_id");
--> statement-breakpoint
CREATE INDEX "stock_balance_org_item_idx" ON "stock_balance" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balance_org_warehouse_item_uidx" ON "stock_balance" USING btree ("organization_id","warehouse_id","item_id");
--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_id_idx" ON "stock_ledger_entry" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_movement_idx" ON "stock_ledger_entry" USING btree ("organization_id","movement_id");
--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_warehouse_item_idx" ON "stock_ledger_entry" USING btree ("organization_id","warehouse_id","item_id");
--> statement-breakpoint
CREATE INDEX "stock_ledger_entry_org_created_at_idx" ON "stock_ledger_entry" USING btree ("organization_id","created_at","id");
--> statement-breakpoint
CREATE INDEX "stock_reservation_org_id_idx" ON "stock_reservation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "stock_reservation_org_status_idx" ON "stock_reservation" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "stock_reservation_org_warehouse_item_idx" ON "stock_reservation" USING btree ("organization_id","warehouse_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_reservation_org_normalized_code_uidx" ON "stock_reservation" USING btree ("organization_id","normalized_code");
