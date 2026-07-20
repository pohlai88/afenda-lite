CREATE TABLE "sales_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"customer_party_code" text NOT NULL,
	"customer_party_name" text NOT NULL,
	"currency_code" text NOT NULL,
	"sales_order_id" uuid,
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
CREATE TABLE "sales_invoice_line" (
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
CREATE TABLE "sales_credit_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"customer_party_code" text NOT NULL,
	"customer_party_name" text NOT NULL,
	"sales_invoice_id" uuid,
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
CREATE TABLE "customer_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
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
CREATE TABLE "customer_balance_projection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"customer_party_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"open_balance" text DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_sales_order_id_sales_order_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_invoice_line" ADD CONSTRAINT "sales_invoice_line_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_invoice_line" ADD CONSTRAINT "sales_invoice_line_item_id_md_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_credit_note" ADD CONSTRAINT "sales_credit_note_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_credit_note" ADD CONSTRAINT "sales_credit_note_sales_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_sales_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_allocation" ADD CONSTRAINT "customer_allocation_credit_note_id_sales_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."sales_credit_note"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "customer_balance_projection" ADD CONSTRAINT "customer_balance_projection_customer_party_id_md_party_id_fk" FOREIGN KEY ("customer_party_id") REFERENCES "public"."md_party"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sales_invoice_org_id_idx" ON "sales_invoice" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "sales_invoice_org_status_idx" ON "sales_invoice" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "sales_invoice_org_customer_idx" ON "sales_invoice" USING btree ("organization_id","customer_party_id");
--> statement-breakpoint
CREATE INDEX "sales_invoice_org_sales_order_idx" ON "sales_invoice" USING btree ("organization_id","sales_order_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoice_org_normalized_code_uidx" ON "sales_invoice" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_id_idx" ON "sales_invoice_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_invoice_idx" ON "sales_invoice_line" USING btree ("organization_id","invoice_id");
--> statement-breakpoint
CREATE INDEX "sales_invoice_line_org_item_idx" ON "sales_invoice_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoice_line_org_invoice_line_no_uidx" ON "sales_invoice_line" USING btree ("organization_id","invoice_id","line_no");
--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_id_idx" ON "sales_credit_note" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_status_idx" ON "sales_credit_note" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_customer_idx" ON "sales_credit_note" USING btree ("organization_id","customer_party_id");
--> statement-breakpoint
CREATE INDEX "sales_credit_note_org_invoice_idx" ON "sales_credit_note" USING btree ("organization_id","sales_invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_credit_note_org_normalized_code_uidx" ON "sales_credit_note" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE INDEX "customer_allocation_org_id_idx" ON "customer_allocation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "customer_allocation_org_customer_idx" ON "customer_allocation" USING btree ("organization_id","customer_party_id");
--> statement-breakpoint
CREATE INDEX "customer_allocation_org_invoice_idx" ON "customer_allocation" USING btree ("organization_id","sales_invoice_id");
--> statement-breakpoint
CREATE INDEX "customer_allocation_org_credit_note_idx" ON "customer_allocation" USING btree ("organization_id","credit_note_id");
--> statement-breakpoint
CREATE INDEX "customer_balance_projection_org_id_idx" ON "customer_balance_projection" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_balance_projection_org_customer_currency_uidx" ON "customer_balance_projection" USING btree ("organization_id","customer_party_id","currency_code");
