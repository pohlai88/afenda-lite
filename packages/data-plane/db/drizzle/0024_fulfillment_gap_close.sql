-- Fulfillment F6 idempotency + F7 POD outcome + F3 reservation on pick

-- Add idempotency keys to delivery
ALTER TABLE "delivery" ADD COLUMN "create_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "post_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "cancel_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "close_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "pack_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "pick_start_idempotency_key" text;
ALTER TABLE "delivery" ADD COLUMN "pod_idempotency_key" text;

-- Add line idempotency key to delivery_line
ALTER TABLE "delivery_line" ADD COLUMN "line_idempotency_key" text;

-- Add pick idempotency key and reservation_id to delivery_pick
ALTER TABLE "delivery_pick" ADD COLUMN "pick_idempotency_key" text;
ALTER TABLE "delivery_pick" ADD COLUMN "reservation_id" uuid;

-- Add pack idempotency key to delivery_pack (not strictly needed if delivery stores it, but for consistency)

-- Add POD outcome fields to proof_of_delivery
ALTER TABLE "proof_of_delivery" ADD COLUMN "outcome" text NOT NULL DEFAULT 'delivered';
ALTER TABLE "proof_of_delivery" ADD COLUMN "proof_type" text;
ALTER TABLE "proof_of_delivery" ADD COLUMN "evidence_ref" text;
ALTER TABLE "proof_of_delivery" ADD COLUMN "carrier_ref" text;

-- Check constraint for outcome enum
ALTER TABLE "proof_of_delivery" ADD CONSTRAINT "proof_of_delivery_outcome_check" 
  CHECK (outcome IN ('delivered', 'partially_delivered', 'refused', 'failed'));
