UPDATE "md_party_role"
SET
	"status" = 'archived',
	"archived_at" = COALESCE("archived_at", "retired_at", now()),
	"archived_by" = COALESCE("archived_by", "retired_by", "updated_by")
WHERE "status" = 'retired';--> statement-breakpoint
DROP INDEX "md_party_role_org_party_code_live_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_role_org_party_code_live_uidx" ON "md_party_role" USING btree ("organization_id","party_id","role_code") WHERE "md_party_role"."archived_at" IS NULL;--> statement-breakpoint
ALTER TABLE "md_party_role" ADD CONSTRAINT "md_party_role_status_check" CHECK ("md_party_role"."status" IN ('draft', 'active', 'inactive', 'retired', 'archived'));
