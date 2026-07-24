CREATE TABLE "md_organization_dimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"normalized_key" text NOT NULL,
	"name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "md_org_dimension_kind_check" CHECK ("kind" IN ('legal_entity', 'business_unit', 'location', 'cost_centre', 'project')),
	CONSTRAINT "md_org_dimension_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE INDEX "md_org_dimension_org_kind_key_idx" ON "md_organization_dimension" USING btree ("organization_id","kind","normalized_key");
--> statement-breakpoint
CREATE INDEX "md_org_dimension_org_effective_idx" ON "md_organization_dimension" USING btree ("organization_id","effective_from","effective_to");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_org_dimension_org_id_uidx" ON "md_organization_dimension" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_org_dimension_org_kind_key_from_uidx" ON "md_organization_dimension" USING btree ("organization_id","kind","normalized_key","effective_from");
--> statement-breakpoint
ALTER TABLE "md_organization_dimension" ADD CONSTRAINT "md_org_dimension_org_supersedes_fk" FOREIGN KEY ("organization_id","supersedes_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "legal_entity_dimension_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "legal_entity_key_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "legal_entity_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "business_unit_dimension_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "business_unit_key_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "business_unit_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "location_dimension_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "location_key_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "location_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "cost_centre_dimension_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "cost_centre_key_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "cost_centre_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "project_dimension_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "project_key_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD COLUMN "project_name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_legal_entity_dimension_fk" FOREIGN KEY ("organization_id","legal_entity_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_business_unit_dimension_fk" FOREIGN KEY ("organization_id","business_unit_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_location_dimension_fk" FOREIGN KEY ("organization_id","location_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_cost_centre_dimension_fk" FOREIGN KEY ("organization_id","cost_centre_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment" ADD CONSTRAINT "hr_work_assignment_org_project_dimension_fk" FOREIGN KEY ("organization_id","project_dimension_id") REFERENCES "public"."md_organization_dimension"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_legal_entity_idx" ON "hr_work_assignment" USING btree ("organization_id","legal_entity_dimension_id");
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_business_unit_idx" ON "hr_work_assignment" USING btree ("organization_id","business_unit_dimension_id");
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_location_idx" ON "hr_work_assignment" USING btree ("organization_id","location_dimension_id");
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_cost_centre_idx" ON "hr_work_assignment" USING btree ("organization_id","cost_centre_dimension_id");
--> statement-breakpoint
CREATE INDEX "hr_work_assignment_org_project_idx" ON "hr_work_assignment" USING btree ("organization_id","project_dimension_id");
