CREATE TABLE "platform_search_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"entity" text NOT NULL,
	"document_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"metadata" jsonb,
	"search_vector" "tsvector" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_search_document_org_entity_doc_uidx" ON "platform_search_document" USING btree ("organization_id","entity","document_id");--> statement-breakpoint
CREATE INDEX "platform_search_document_org_entity_idx" ON "platform_search_document" USING btree ("organization_id","entity");--> statement-breakpoint
CREATE INDEX "platform_search_document_search_vector_gin_idx" ON "platform_search_document" USING gin ("search_vector");