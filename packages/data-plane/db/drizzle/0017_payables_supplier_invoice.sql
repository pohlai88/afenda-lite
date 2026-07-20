CREATE TABLE "supplier_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_party_code" text NOT NULL,
	"supplier_party_name" text NOT NULL,
	"currency_code" text NOT NULL,
	"purchase_order_id" uuid,
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
CREATE TABLE "supplier_invoice_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"item_name" text NOT NULL,
	"quantity" text NOT NULL,
	"unit_price" text NOT NULL,
	"line_amount" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_credit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_party_code" text NOT NULL,
	"supplier_party_name" text NOT NULL,
	"supplier_invoice_id" uuid,
	"currency_code" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"posted_at" timestamp with time zone,
	"posted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"supplier_invoice_id" uuid NOT NULL,
	"payment_id" uuid,
	"credit_note_id" uuid,
	"amount" text NOT NULL,
	"allocated_at" timestamp with time zone NOT NULL,
	"allocated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "three_way_match_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_invoice_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"goods_receipt_id" uuid,
	"match_status" text NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_balance_projection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_party_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"open_balance" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplier_invoice" ADD CONSTRAINT "supplier_invoice_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_invoice" ADD CONSTRAINT "supplier_invoice_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_invoice_line" ADD CONSTRAINT "supplier_invoice_line_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_invoice_line" ADD CONSTRAINT "supplier_invoice_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_credit_note" ADD CONSTRAINT "supplier_credit_note_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_credit_note" ADD CONSTRAINT "supplier_credit_note_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_allocation" ADD CONSTRAINT "supplier_allocation_credit_note_id_supplier_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."supplier_credit_note"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_supplier_invoice_id_supplier_invoice_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "three_way_match_result" ADD CONSTRAINT "three_way_match_result_goods_receipt_id_goods_receipt_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipt"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "supplier_balance_projection" ADD CONSTRAINT "supplier_balance_projection_supplier_party_id_md_party_id_fk" FOREIGN KEY ("supplier_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_id_idx" ON "supplier_invoice" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_status_idx" ON "supplier_invoice" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_supplier_idx" ON "supplier_invoice" USING btree ("organization_id","supplier_party_id");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_org_purchase_order_idx" ON "supplier_invoice" USING btree ("organization_id","purchase_order_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_invoice_org_normalized_code_uidx" ON "supplier_invoice" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_id_idx" ON "supplier_invoice_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_invoice_idx" ON "supplier_invoice_line" USING btree ("organization_id","invoice_id");
--> statement-breakpoint
CREATE INDEX "supplier_invoice_line_org_item_idx" ON "supplier_invoice_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_invoice_line_org_invoice_line_no_uidx" ON "supplier_invoice_line" USING btree ("organization_id","invoice_id","line_no");
--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_id_idx" ON "supplier_credit_note" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_status_idx" ON "supplier_credit_note" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_supplier_idx" ON "supplier_credit_note" USING btree ("organization_id","supplier_party_id");
--> statement-breakpoint
CREATE INDEX "supplier_credit_note_org_invoice_idx" ON "supplier_credit_note" USING btree ("organization_id","supplier_invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_credit_note_org_normalized_code_uidx" ON "supplier_credit_note" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_id_idx" ON "supplier_allocation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_supplier_idx" ON "supplier_allocation" USING btree ("organization_id","supplier_party_id");
--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_invoice_idx" ON "supplier_allocation" USING btree ("organization_id","supplier_invoice_id");
--> statement-breakpoint
CREATE INDEX "supplier_allocation_org_credit_note_idx" ON "supplier_allocation" USING btree ("organization_id","credit_note_id");
--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_id_idx" ON "three_way_match_result" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_invoice_idx" ON "three_way_match_result" USING btree ("organization_id","supplier_invoice_id");
--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_purchase_order_idx" ON "three_way_match_result" USING btree ("organization_id","purchase_order_id");
--> statement-breakpoint
CREATE INDEX "three_way_match_result_org_goods_receipt_idx" ON "three_way_match_result" USING btree ("organization_id","goods_receipt_id");
--> statement-breakpoint
CREATE INDEX "supplier_balance_projection_org_id_idx" ON "supplier_balance_projection" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_balance_projection_org_supplier_currency_uidx" ON "supplier_balance_projection" USING btree ("organization_id","supplier_party_id","currency_code");
