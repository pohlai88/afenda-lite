ALTER TABLE "purchase_order" ADD COLUMN "payment_term_name" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "currency_code" text;--> statement-breakpoint
UPDATE "purchase_order" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;--> statement-breakpoint
ALTER TABLE "purchase_order" ALTER COLUMN "currency_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "exchange_rate" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "subtotal_amount" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "discount_total" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "tax_total" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "document_total" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "close_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "closed_by" text;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "unit_price" text;--> statement-breakpoint
UPDATE "purchase_order_line" SET "unit_price" = '0' WHERE "unit_price" IS NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ALTER COLUMN "unit_price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "discount_amount" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "tax_classification" text;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "line_amount" text;--> statement-breakpoint
UPDATE "purchase_order_line" SET "line_amount" = (COALESCE("quantity"::numeric, 0) * COALESCE("unit_price"::numeric, 0))::text WHERE "line_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ALTER COLUMN "line_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "over_receipt_percent" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "under_receipt_percent" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "invoice_quantity_tolerance_percent" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "invoice_price_tolerance_percent" text DEFAULT '0' NOT NULL;
