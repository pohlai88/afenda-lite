DROP INDEX IF EXISTS "md_party_contact_primary_type_purpose_uidx";--> statement-breakpoint
ALTER TABLE "md_party_contact" RENAME COLUMN "valid_from" TO "effective_from";--> statement-breakpoint
ALTER TABLE "md_party_contact" RENAME COLUMN "valid_to" TO "effective_to";--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "normalized_value" text;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "md_party_contact"
SET "normalized_value" = CASE lower("contact_type")
	WHEN 'email' THEN
		CASE WHEN position('@' in trim("value")) > 1
			THEN split_part(trim("value"), '@', 1) || '@' || lower(split_part(trim("value"), '@', 2))
			ELSE trim("value")
		END
	WHEN 'telephone' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'mobile' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'fax' THEN regexp_replace(regexp_replace(trim("value"), '[[:space:]().-]', '', 'g'), '^00', '+')
	WHEN 'website' THEN
		CASE WHEN position('://' in trim("value")) > 0
			THEN lower(split_part(trim("value"), '://', 1)) || '://' ||
				lower(split_part(split_part(trim("value"), '://', 2), '/', 1)) ||
				CASE WHEN position('/' in split_part(trim("value"), '://', 2)) > 0
					THEN substring(split_part(trim("value"), '://', 2) from position('/' in split_part(trim("value"), '://', 2)))
					ELSE ''
				END
			ELSE trim("value")
		END
	ELSE trim("value")
END,
"contact_type" = CASE lower("contact_type")
	WHEN 'email' THEN 'email'
	WHEN 'telephone' THEN 'telephone'
	WHEN 'mobile' THEN 'mobile'
	WHEN 'fax' THEN 'fax'
	WHEN 'website' THEN 'website'
	WHEN 'messaging' THEN 'messaging'
	ELSE 'other'
END,
"purpose" = nullif(lower(trim("purpose")), ''),
"verification_status" = CASE lower("verification_status")
	WHEN 'pending' THEN 'pending'
	WHEN 'failed' THEN 'failed'
	ELSE 'unverified'
END,
"status" = CASE lower("status")
	WHEN 'draft' THEN 'draft'
	WHEN 'active' THEN 'active'
	WHEN 'inactive' THEN 'inactive'
	WHEN 'archived' THEN 'archived'
	ELSE 'inactive'
END;--> statement-breakpoint
ALTER TABLE "md_party_contact" ALTER COLUMN "normalized_value" SET NOT NULL;--> statement-breakpoint
WITH ranked_primary AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "organization_id", "party_id", "contact_type", coalesce("purpose", '')
		ORDER BY "updated_at" DESC, "id"
	) AS priority
	FROM "md_party_contact"
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_contact" AS contact
SET "is_primary" = false,
	"version" = contact."version" + 1,
	"updated_at" = now()
FROM ranked_primary
WHERE contact."id" = ranked_primary."id" AND ranked_primary.priority > 1;--> statement-breakpoint
CREATE INDEX "md_party_contact_org_normalized_value_idx" ON "md_party_contact" USING btree ("organization_id", "contact_type", "normalized_value");--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_type_check" CHECK ("contact_type" IN ('email', 'telephone', 'mobile', 'fax', 'website', 'messaging', 'other'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_verification_status_check" CHECK ("verification_status" IN ('unverified', 'pending', 'verified', 'failed'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_verification_timestamp_check" CHECK (("verification_status" = 'verified' AND "verified_at" IS NOT NULL) OR ("verification_status" <> 'verified' AND "verified_at" IS NULL));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_status_check" CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));--> statement-breakpoint
ALTER TABLE "md_party_contact" ADD CONSTRAINT "md_party_contact_effective_range_check" CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_from" <= "effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_contact_primary_type_purpose_uidx" ON "md_party_contact" USING btree ("organization_id", "party_id", "contact_type", coalesce("purpose", '')) WHERE "md_party_contact"."is_primary" = true AND "md_party_contact"."status" = 'active' AND "md_party_contact"."archived_at" IS NULL;
