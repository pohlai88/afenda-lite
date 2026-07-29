-- Legacy Sales rows are intentionally not preserved by this rebuild.
DROP INDEX IF EXISTS "md_payment_term_org_id_idx";
--> statement-breakpoint
ALTER TABLE "md_payment_term" ADD CONSTRAINT "md_payment_term_org_id_uidx" UNIQUE ("organization_id", "id");
--> statement-breakpoint
DROP TABLE IF EXISTS "sales_return_authorization_line" CASCADE;
DROP TABLE IF EXISTS "sales_return_authorization" CASCADE;
DROP TABLE IF EXISTS "sales_order_hold" CASCADE;
DROP TABLE IF EXISTS "sales_order_schedule" CASCADE;
DROP TABLE IF EXISTS "sales_order_line" CASCADE;
DROP TABLE IF EXISTS "sales_order" CASCADE;
DROP TABLE IF EXISTS "sales_quotation_line" CASCADE;
DROP TABLE IF EXISTS "sales_quotation" CASCADE;
DROP TABLE IF EXISTS "sales_price_book_entry" CASCADE;
DROP TABLE IF EXISTS "sales_price_book" CASCADE;
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"party_id" uuid NOT NULL,
	"payment_term_id" uuid,
	"customer_snapshot" jsonb NOT NULL,
	"currency_code" text NOT NULL,
	"exchange_rate" numeric(24, 12),
	"subtotal_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"discount_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"tax_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"document_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"source_quotation_id" uuid,
	"credit_check_reference" text,
	"availability_reference" text,
	"create_idempotency_key" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_status_ck" CHECK ("sales_order"."status" IN ('draft','submitted','approved','confirmed','released','partially_fulfilled','fulfilled','cancelled','closed')),
	CONSTRAINT "sales_order_amounts_ck" CHECK ("sales_order"."subtotal_amount" >= 0 AND "sales_order"."discount_total" >= 0 AND "sales_order"."tax_total" >= 0 AND "sales_order"."document_total" >= 0),
	CONSTRAINT "sales_order_version_ck" CHECK ("sales_order"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_order_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_hold_kind_ck" CHECK ("sales_order_hold"."kind" IN ('credit','availability','pricing_margin','compliance','manual_review')),
	CONSTRAINT "sales_order_hold_status_ck" CHECK ("sales_order_hold"."status" IN ('open','resolved')),
	CONSTRAINT "sales_order_hold_version_ck" CHECK ("sales_order_hold"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_snapshot" jsonb NOT NULL,
	"quantity" numeric(24, 6) NOT NULL,
	"fulfilled_quantity" numeric(24, 6) DEFAULT '0' NOT NULL,
	"unit_price" numeric(24, 6) NOT NULL,
	"discount_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"line_amount" numeric(24, 6) NOT NULL,
	"pricing_trace" jsonb,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_line_values_ck" CHECK ("sales_order_line"."quantity" > 0 AND "sales_order_line"."fulfilled_quantity" >= 0 AND "sales_order_line"."fulfilled_quantity" <= "sales_order_line"."quantity" AND "sales_order_line"."unit_price" >= 0 AND "sales_order_line"."discount_amount" >= 0 AND "sales_order_line"."tax_amount" >= 0 AND "sales_order_line"."line_amount" >= 0),
	CONSTRAINT "sales_order_line_version_ck" CHECK ("sales_order_line"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_order_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"requested_date" timestamp with time zone NOT NULL,
	"promised_date" timestamp with time zone,
	"quantity" numeric(24, 6) NOT NULL,
	"released_quantity" numeric(24, 6) DEFAULT '0' NOT NULL,
	"fulfilled_quantity" numeric(24, 6) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_order_schedule_values_ck" CHECK ("sales_order_schedule"."quantity" > 0 AND "sales_order_schedule"."released_quantity" >= 0 AND "sales_order_schedule"."released_quantity" <= "sales_order_schedule"."quantity" AND "sales_order_schedule"."fulfilled_quantity" >= 0 AND "sales_order_schedule"."fulfilled_quantity" <= "sales_order_schedule"."quantity"),
	CONSTRAINT "sales_order_schedule_version_ck" CHECK ("sales_order_schedule"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_price_book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"currency_code" text NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"priority" integer DEFAULT 100 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_price_book_version_ck" CHECK ("sales_price_book"."version" > 0),
	CONSTRAINT "sales_price_book_dates_ck" CHECK ("sales_price_book"."valid_to" IS NULL OR "sales_price_book"."valid_to" >= "sales_price_book"."valid_from"),
	CONSTRAINT "sales_price_book_status_ck" CHECK ("sales_price_book"."status" IN ('draft','active','inactive','archived'))
);
--> statement-breakpoint
CREATE TABLE "sales_price_book_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"price_book_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"uom_id" uuid NOT NULL,
	"minimum_quantity" numeric(24, 6) NOT NULL,
	"unit_price" numeric(24, 6) NOT NULL,
	"discount_percent" numeric(9, 6) DEFAULT '0' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_price_book_entry_values_ck" CHECK ("sales_price_book_entry"."minimum_quantity" > 0 AND "sales_price_book_entry"."unit_price" >= 0 AND "sales_price_book_entry"."discount_percent" >= 0 AND "sales_price_book_entry"."discount_percent" <= 100),
	CONSTRAINT "sales_price_book_entry_dates_ck" CHECK ("sales_price_book_entry"."valid_to" IS NULL OR "sales_price_book_entry"."valid_to" >= "sales_price_book_entry"."valid_from"),
	CONSTRAINT "sales_price_book_entry_version_ck" CHECK ("sales_price_book_entry"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_quotation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"party_id" uuid NOT NULL,
	"payment_term_id" uuid,
	"customer_snapshot" jsonb NOT NULL,
	"currency_code" text NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"subtotal_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"discount_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"tax_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"document_total" numeric(24, 6) DEFAULT '0' NOT NULL,
	"converted_order_id" uuid,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_quotation_status_ck" CHECK ("sales_quotation"."status" IN ('draft','submitted','approved','sent','accepted','expired','rejected','cancelled','converted')),
	CONSTRAINT "sales_quotation_amounts_ck" CHECK ("sales_quotation"."subtotal_amount" >= 0 AND "sales_quotation"."discount_total" >= 0 AND "sales_quotation"."tax_total" >= 0 AND "sales_quotation"."document_total" >= 0),
	CONSTRAINT "sales_quotation_version_ck" CHECK ("sales_quotation"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_quotation_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"quotation_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" uuid NOT NULL,
	"item_snapshot" jsonb NOT NULL,
	"quantity" numeric(24, 6) NOT NULL,
	"unit_price" numeric(24, 6) NOT NULL,
	"discount_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(24, 6) DEFAULT '0' NOT NULL,
	"line_amount" numeric(24, 6) NOT NULL,
	"pricing_trace" jsonb,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_quotation_line_values_ck" CHECK ("sales_quotation_line"."quantity" > 0 AND "sales_quotation_line"."unit_price" >= 0 AND "sales_quotation_line"."discount_amount" >= 0 AND "sales_quotation_line"."tax_amount" >= 0 AND "sales_quotation_line"."line_amount" >= 0),
	CONSTRAINT "sales_quotation_line_version_ck" CHECK ("sales_quotation_line"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_return_authorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reason" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_return_authorization_status_ck" CHECK ("sales_return_authorization"."status" IN ('draft','submitted','approved','rejected','cancelled','closed')),
	CONSTRAINT "sales_return_authorization_version_ck" CHECK ("sales_return_authorization"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_return_authorization_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"return_authorization_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"quantity" numeric(24, 6) NOT NULL,
	"reason" text NOT NULL,
	"requested_disposition" text NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_return_authorization_line_quantity_ck" CHECK ("sales_return_authorization_line"."quantity" > 0),
	CONSTRAINT "sales_return_authorization_line_disposition_ck" CHECK ("sales_return_authorization_line"."requested_disposition" IN ('refund','replacement','repair','reject')),
	CONSTRAINT "sales_return_authorization_line_version_ck" CHECK ("sales_return_authorization_line"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_org_id_uidx" ON "sales_order" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_org_code_uidx" ON "sales_order" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_org_idem_uidx" ON "sales_order" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_hold_org_id_uidx" ON "sales_order_hold" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_hold_org_idem_uidx" ON "sales_order_hold" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_line_org_id_uidx" ON "sales_order_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_line_org_no_uidx" ON "sales_order_line" USING btree ("organization_id","order_id","line_no");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_line_org_idem_uidx" ON "sales_order_line" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_schedule_org_id_uidx" ON "sales_order_schedule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_price_book_org_id_uidx" ON "sales_price_book" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_price_book_org_code_uidx" ON "sales_price_book" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_price_book_org_idem_uidx" ON "sales_price_book" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_price_book_entry_org_id_uidx" ON "sales_price_book_entry" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_price_book_entry_org_idem_uidx" ON "sales_price_book_entry" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_org_id_uidx" ON "sales_quotation" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_org_code_revision_uidx" ON "sales_quotation" USING btree ("organization_id","normalized_code","revision");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_org_idem_uidx" ON "sales_quotation" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_line_org_id_uidx" ON "sales_quotation_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_line_org_no_uidx" ON "sales_quotation_line" USING btree ("organization_id","quotation_id","line_no");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_quotation_line_org_idem_uidx" ON "sales_quotation_line" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_authorization_org_id_uidx" ON "sales_return_authorization" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_authorization_org_code_uidx" ON "sales_return_authorization" USING btree ("organization_id","normalized_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_authorization_org_idem_uidx" ON "sales_return_authorization" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_authorization_line_org_id_uidx" ON "sales_return_authorization_line" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_authorization_line_org_idem_uidx" ON "sales_return_authorization_line" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX "sales_order_org_status_idx" ON "sales_order" USING btree ("organization_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "sales_order_org_party_idx" ON "sales_order" USING btree ("organization_id","party_id");
--> statement-breakpoint
CREATE INDEX "sales_order_hold_org_order_status_idx" ON "sales_order_hold" USING btree ("organization_id","order_id","status");
--> statement-breakpoint
CREATE INDEX "sales_order_line_org_item_idx" ON "sales_order_line" USING btree ("organization_id","item_id");
--> statement-breakpoint
CREATE INDEX "sales_order_schedule_org_order_idx" ON "sales_order_schedule" USING btree ("organization_id","order_id","requested_date");
--> statement-breakpoint
CREATE INDEX "sales_price_book_org_status_dates_idx" ON "sales_price_book" USING btree ("organization_id","status","valid_from","valid_to");
--> statement-breakpoint
CREATE INDEX "sales_price_book_entry_lookup_idx" ON "sales_price_book_entry" USING btree ("organization_id","item_id","uom_id","minimum_quantity");
--> statement-breakpoint
CREATE INDEX "sales_quotation_org_status_idx" ON "sales_quotation" USING btree ("organization_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "sales_return_authorization_org_status_idx" ON "sales_return_authorization" USING btree ("organization_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "sales_return_authorization_line_parent_idx" ON "sales_return_authorization_line" USING btree ("organization_id","return_authorization_id");
--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_payment_term_fk" FOREIGN KEY ("organization_id","payment_term_id") REFERENCES "public"."md_payment_term"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_source_quotation_fk" FOREIGN KEY ("organization_id","source_quotation_id") REFERENCES "public"."sales_quotation"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order_hold" ADD CONSTRAINT "sales_order_hold_order_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."sales_order"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_parent_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."sales_order"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD CONSTRAINT "sales_order_line_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order_schedule" ADD CONSTRAINT "sales_order_schedule_order_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."sales_order"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_order_schedule" ADD CONSTRAINT "sales_order_schedule_line_fk" FOREIGN KEY ("organization_id","order_line_id") REFERENCES "public"."sales_order_line"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_price_book_entry" ADD CONSTRAINT "sales_price_book_entry_book_fk" FOREIGN KEY ("organization_id","price_book_id") REFERENCES "public"."sales_price_book"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_price_book_entry" ADD CONSTRAINT "sales_price_book_entry_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_quotation" ADD CONSTRAINT "sales_quotation_party_fk" FOREIGN KEY ("organization_id","party_id") REFERENCES "public"."md_party"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_quotation" ADD CONSTRAINT "sales_quotation_payment_term_fk" FOREIGN KEY ("organization_id","payment_term_id") REFERENCES "public"."md_payment_term"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_quotation_line" ADD CONSTRAINT "sales_quotation_line_parent_fk" FOREIGN KEY ("organization_id","quotation_id") REFERENCES "public"."sales_quotation"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_quotation_line" ADD CONSTRAINT "sales_quotation_line_item_fk" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."md_item"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_return_authorization" ADD CONSTRAINT "sales_return_authorization_order_fk" FOREIGN KEY ("organization_id","order_id") REFERENCES "public"."sales_order"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_return_authorization_line" ADD CONSTRAINT "sales_return_authorization_line_parent_fk" FOREIGN KEY ("organization_id","return_authorization_id") REFERENCES "public"."sales_return_authorization"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_return_authorization_line" ADD CONSTRAINT "sales_return_authorization_line_order_line_fk" FOREIGN KEY ("organization_id","order_line_id") REFERENCES "public"."sales_order_line"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_sales_order_id_sales_order_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("id") ON DELETE no action ON UPDATE no action;
