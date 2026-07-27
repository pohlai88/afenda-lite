DROP INDEX IF EXISTS "md_party_address_primary_type_uidx";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "region" TO "administrative_area";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "is_default" TO "is_primary";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "verification_status" TO "validation_status";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "valid_from" TO "effective_from";--> statement-breakpoint
ALTER TABLE "md_party_address" RENAME COLUMN "valid_to" TO "effective_to";--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "line3" text;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD COLUMN "attention" text;--> statement-breakpoint
UPDATE "md_party_address"
SET "purpose" = CASE lower("address_type")
	WHEN 'registered' THEN 'registered'
	WHEN 'billing' THEN 'billing'
	WHEN 'shipping' THEN 'shipping'
	WHEN 'operational' THEN 'operational'
	ELSE 'other'
END,
"address_type" = CASE lower("address_type")
	WHEN 'physical' THEN 'physical'
	WHEN 'postal' THEN 'postal'
	WHEN 'registered' THEN 'registered'
	WHEN 'billing' THEN 'billing'
	WHEN 'shipping' THEN 'shipping'
	WHEN 'operational' THEN 'operational'
	ELSE 'physical'
END,
"validation_status" = CASE lower("validation_status")
	WHEN 'verified' THEN 'validated'
	WHEN 'validated' THEN 'validated'
	WHEN 'invalid' THEN 'invalid'
	ELSE 'unvalidated'
END;--> statement-breakpoint
ALTER TABLE "md_party_address" ALTER COLUMN "purpose" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "md_party_address" ALTER COLUMN "validation_status" SET DEFAULT 'unvalidated';--> statement-breakpoint
WITH ranked_primary AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "organization_id", "party_id", "purpose"
		ORDER BY "updated_at" DESC, "id"
	) AS priority
	FROM "md_party_address"
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_address" AS address
SET "is_primary" = false,
	"version" = address."version" + 1,
	"updated_at" = now()
FROM ranked_primary
WHERE address."id" = ranked_primary."id" AND ranked_primary.priority > 1;--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_type_check" CHECK ("address_type" IN ('physical', 'postal', 'registered', 'billing', 'shipping', 'operational'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_purpose_check" CHECK ("purpose" IN ('registered', 'billing', 'shipping', 'correspondence', 'operational', 'returns', 'tax', 'other'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_validation_status_check" CHECK ("validation_status" IN ('unvalidated', 'validated', 'invalid'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_status_check" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));--> statement-breakpoint
ALTER TABLE "md_party_address" ADD CONSTRAINT "md_party_address_effective_range_check" CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_from" <= "effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_address_primary_purpose_active_uidx" ON "md_party_address" USING btree ("organization_id", "party_id", "purpose") WHERE "md_party_address"."is_primary" = true AND "md_party_address"."status" = 'active' AND "md_party_address"."archived_at" IS NULL;
