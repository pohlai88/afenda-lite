ALTER TABLE "md_organization_dimension" ADD COLUMN IF NOT EXISTS "parent_id" uuid;
ALTER TABLE "md_organization_dimension" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "md_organization_dimension" ADD COLUMN IF NOT EXISTS "updated_by" text;
ALTER TABLE "md_organization_dimension" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone;

DO $$ BEGIN
 ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_status_check" CHECK ("status" IN ('active', 'inactive', 'archived'));
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_not_self_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
 ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_org_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "md_organization_dimension"("organization_id","id");
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "md_organization_dimension" DROP CONSTRAINT IF EXISTS "md_org_dimension_kind_check";
ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_kind_check" CHECK ("kind" IN ('legal_entity', 'business_unit', 'location', 'department', 'cost_center', 'cost_centre', 'profit_center', 'channel', 'region', 'brand', 'project', 'custom'));

CREATE INDEX IF NOT EXISTS "md_org_dimension_org_parent_idx" ON "md_organization_dimension" ("organization_id","parent_id");
CREATE INDEX IF NOT EXISTS "md_org_dimension_org_status_idx" ON "md_organization_dimension" ("organization_id","status");
