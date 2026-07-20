ALTER TABLE "sales_order" ADD COLUMN "create_idempotency_key" text;--> statement-breakpoint
UPDATE "sales_order" SET "create_idempotency_key" = "id"::text WHERE "create_idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "sales_order" ALTER COLUMN "create_idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "post_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "cancel_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "bill_to_address_snapshot" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "ship_to_address_snapshot" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "payment_term_name" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "currency_code" text;--> statement-breakpoint
UPDATE "sales_order" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;--> statement-breakpoint
ALTER TABLE "sales_order" ALTER COLUMN "currency_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "exchange_rate" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "subtotal_amount" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "discount_total" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "tax_total" text;--> statement-breakpoint
ALTER TABLE "sales_order" ADD COLUMN "document_total" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_org_create_idempotency_uidx" ON "sales_order" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD COLUMN "line_idempotency_key" text;--> statement-breakpoint
UPDATE "sales_order_line" SET "line_idempotency_key" = "id"::text WHERE "line_idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ALTER COLUMN "line_idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD COLUMN "unit_price" text;--> statement-breakpoint
UPDATE "sales_order_line" SET "unit_price" = '0' WHERE "unit_price" IS NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ALTER COLUMN "unit_price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD COLUMN "discount_amount" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD COLUMN "tax_classification" text;--> statement-breakpoint
ALTER TABLE "sales_order_line" ADD COLUMN "line_amount" text;--> statement-breakpoint
UPDATE "sales_order_line" SET "line_amount" = '0' WHERE "line_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "sales_order_line" ALTER COLUMN "line_amount" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_line_org_order_idempotency_uidx" ON "sales_order_line" USING btree ("organization_id","order_id","line_idempotency_key");
