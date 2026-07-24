ALTER TABLE "platform_notification" ADD COLUMN "deduplication_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_notification_org_user_module_dedupe_uidx"
ON "platform_notification" USING btree (
	"organization_id",
	"user_id",
	"module",
	"deduplication_key"
)
WHERE "deduplication_key" IS NOT NULL;
