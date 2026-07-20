ALTER TABLE "purchase_order" ADD COLUMN "create_idempotency_key" text;--> statement-breakpoint
UPDATE "purchase_order" SET "create_idempotency_key" = "id"::text WHERE "create_idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "purchase_order" ALTER COLUMN "create_idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "post_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "cancel_idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_org_create_idempotency_uidx" ON "purchase_order" USING btree ("organization_id","create_idempotency_key");--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD COLUMN "line_idempotency_key" text;--> statement-breakpoint
UPDATE "purchase_order_line" SET "line_idempotency_key" = "id"::text WHERE "line_idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ALTER COLUMN "line_idempotency_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_line_org_order_idempotency_uidx" ON "purchase_order_line" USING btree ("organization_id","order_id","line_idempotency_key");
