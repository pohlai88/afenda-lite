-- N12: drop historical unattributable seed rows (role.permission_grant with null org)
-- so organization_id / actor_user_id can be NOT NULL (ARCH-023 · GUIDE-017).
DELETE FROM "platform_rbac_audit" WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "platform_rbac_audit" ALTER COLUMN "actor_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_rbac_audit" ALTER COLUMN "organization_id" SET NOT NULL;