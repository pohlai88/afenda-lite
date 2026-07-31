ALTER TABLE "platform_domain_event" ADD COLUMN "claim_token" uuid;--> statement-breakpoint
ALTER TABLE "platform_domain_event" ADD COLUMN "claimed_at" timestamp with time zone;
