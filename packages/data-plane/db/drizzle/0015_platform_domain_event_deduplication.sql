ALTER TABLE "platform_domain_event"
	ADD COLUMN "deduplication_key" text;
--> statement-breakpoint

CREATE UNIQUE INDEX "platform_domain_event_org_source_type_dedupe_uidx"
	ON "platform_domain_event"
	USING btree ("organization_id", "source_module", "type", "deduplication_key")
	WHERE "deduplication_key" IS NOT NULL;
