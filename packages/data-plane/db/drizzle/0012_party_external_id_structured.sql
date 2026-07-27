ALTER TABLE "md_party_external_id" RENAME COLUMN "system" TO "source_system";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" RENAME COLUMN "namespace" TO "external_id_type";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" RENAME COLUMN "external_id" TO "external_value";
--> statement-breakpoint
UPDATE "md_party_external_id"
SET "source_system" = lower(trim("source_system")),
	"external_id_type" = CASE
		WHEN trim("external_id_type") = '' THEN 'legacy'
		ELSE lower(trim("external_id_type"))
	END;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "normalized_value" text;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "case_sensitivity" text DEFAULT 'sensitive' NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "md_party_external_id" SET "normalized_value" = "external_value";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ALTER COLUMN "normalized_value" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ALTER COLUMN "case_sensitivity" DROP DEFAULT;
--> statement-breakpoint
DROP INDEX "md_party_external_id_org_sys_ns_ext_uidx";
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_case_sensitivity_ck"
	CHECK ("case_sensitivity" IN ('sensitive', 'insensitive'));
--> statement-breakpoint
ALTER TABLE "md_party_external_id" ADD CONSTRAINT "md_party_external_id_status_ck"
	CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_active_identity_uidx"
	ON "md_party_external_id" USING btree (
		"organization_id", "source_system", "external_id_type", "normalized_value"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_external_id_active_primary_uidx"
	ON "md_party_external_id" USING btree (
		"organization_id", "party_id", "source_system", "external_id_type"
	)
	WHERE "is_primary" = true AND "status" = 'active' AND "archived_at" IS NULL;
