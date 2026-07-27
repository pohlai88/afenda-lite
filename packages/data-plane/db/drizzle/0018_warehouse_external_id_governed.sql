DROP INDEX IF EXISTS "md_warehouse_external_id_org_sys_ns_ext_uidx";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "system" TO "source_system";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "namespace" TO "external_id_type";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id" RENAME COLUMN "external_id" TO "external_value";
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ADD COLUMN "normalized_value" text,
	ADD COLUMN "case_sensitivity" text;
--> statement-breakpoint
UPDATE "md_warehouse_external_id"
SET
	"source_system" = lower(btrim("source_system")),
	"external_id_type" = CASE
		WHEN btrim("external_id_type") = '' THEN 'default'
		ELSE lower(btrim("external_id_type"))
	END,
	"external_value" = btrim("external_value"),
	"normalized_value" = btrim("external_value"),
	"case_sensitivity" = 'sensitive',
	"status" = CASE
		WHEN "status" IN ('draft', 'active', 'inactive', 'archived') THEN "status"
		WHEN "status" IN ('expired', 'revoked', 'terminated', 'retired') THEN 'archived'
		WHEN "status" = 'pending' THEN 'draft'
		ELSE 'active'
	END;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "md_warehouse_external_id"
		WHERE "source_system" !~ '^[a-z0-9._-]+$'
			OR "external_id_type" !~ '^[a-z0-9._-]+$'
			OR "external_value" = ''
	) THEN
		RAISE EXCEPTION 'Warehouse external identifiers contain invalid qualifiers or empty values';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "md_warehouse_external_id"
		WHERE "status" = 'active' AND "archived_at" IS NULL
		GROUP BY "organization_id", "source_system", "external_id_type", "normalized_value"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Duplicate active warehouse external identifier identities must be resolved before migration';
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ALTER COLUMN "external_id_type" DROP DEFAULT,
	ALTER COLUMN "normalized_value" SET NOT NULL,
	ALTER COLUMN "case_sensitivity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_warehouse_external_id"
	ADD CONSTRAINT "md_warehouse_external_id_source_system_ck"
		CHECK ("source_system" ~ '^[a-z0-9._-]+$'),
	ADD CONSTRAINT "md_warehouse_external_id_type_ck"
		CHECK ("external_id_type" ~ '^[a-z0-9._-]+$'),
	ADD CONSTRAINT "md_warehouse_external_id_case_sensitivity_ck"
		CHECK ("case_sensitivity" IN ('sensitive', 'insensitive')),
	ADD CONSTRAINT "md_warehouse_external_id_status_ck"
		CHECK ("status" IN ('draft', 'active', 'inactive', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX "md_warehouse_external_id_active_identity_uidx"
	ON "md_warehouse_external_id" USING btree (
		"organization_id",
		"source_system",
		"external_id_type",
		"normalized_value"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
