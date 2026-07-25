CREATE TABLE "hr_department_structure_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parent_department_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_structure_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_department_structure_version_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_department_structure_version_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_job_definition_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"title" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_definition_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_job_definition_version_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_job_definition_version_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_position_definition_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"position_id" uuid NOT NULL,
	"title" text NOT NULL,
	"department_id" uuid,
	"job_id" uuid,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_definition_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_position_definition_version_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_position_definition_version_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
ALTER TABLE "hr_department_structure_version" ADD CONSTRAINT "hr_department_structure_version_supersedes_structure_version_id_hr_department_structure_version_id_fk" FOREIGN KEY ("supersedes_structure_version_id") REFERENCES "public"."hr_department_structure_version"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_job_definition_version" ADD CONSTRAINT "hr_job_definition_version_supersedes_definition_version_id_hr_job_definition_version_id_fk" FOREIGN KEY ("supersedes_definition_version_id") REFERENCES "public"."hr_job_definition_version"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_position_definition_version" ADD CONSTRAINT "hr_position_definition_version_supersedes_definition_version_id_hr_position_definition_version_id_fk" FOREIGN KEY ("supersedes_definition_version_id") REFERENCES "public"."hr_position_definition_version"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_department_org_id_uidx" ON "hr_department" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_job_org_id_uidx" ON "hr_job" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_position_org_id_uidx" ON "hr_position" USING btree ("organization_id","id");
--> statement-breakpoint
ALTER TABLE "hr_department_structure_version" ADD CONSTRAINT "hr_department_structure_version_org_department_fk" FOREIGN KEY ("organization_id","department_id") REFERENCES "public"."hr_department"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_job_definition_version" ADD CONSTRAINT "hr_job_definition_version_org_job_fk" FOREIGN KEY ("organization_id","job_id") REFERENCES "public"."hr_job"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_position_definition_version" ADD CONSTRAINT "hr_position_definition_version_org_position_fk" FOREIGN KEY ("organization_id","position_id") REFERENCES "public"."hr_position"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "supersedes_reporting_line_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD COLUMN "superseded_by_reporting_line_id" uuid;
--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_supersedes_reporting_line_id_hr_reporting_line_id_fk" FOREIGN KEY ("supersedes_reporting_line_id") REFERENCES "public"."hr_reporting_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_reporting_line" ADD CONSTRAINT "hr_reporting_line_superseded_by_reporting_line_id_hr_reporting_line_id_fk" FOREIGN KEY ("superseded_by_reporting_line_id") REFERENCES "public"."hr_reporting_line"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_department_structure_version_org_department_idx" ON "hr_department_structure_version" USING btree ("organization_id","department_id");
--> statement-breakpoint
CREATE INDEX "hr_department_structure_version_org_id_idx" ON "hr_department_structure_version" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_department_structure_version_org_department_open_uidx" ON "hr_department_structure_version" USING btree ("organization_id","department_id") WHERE "effective_to" IS NULL AND "lineage_status" = 'active';
--> statement-breakpoint
CREATE INDEX "hr_job_definition_version_org_job_idx" ON "hr_job_definition_version" USING btree ("organization_id","job_id");
--> statement-breakpoint
CREATE INDEX "hr_job_definition_version_org_id_idx" ON "hr_job_definition_version" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_job_definition_version_org_job_open_uidx" ON "hr_job_definition_version" USING btree ("organization_id","job_id") WHERE "effective_to" IS NULL AND "lineage_status" = 'active';
--> statement-breakpoint
CREATE INDEX "hr_position_definition_version_org_position_idx" ON "hr_position_definition_version" USING btree ("organization_id","position_id");
--> statement-breakpoint
CREATE INDEX "hr_position_definition_version_org_id_idx" ON "hr_position_definition_version" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_position_definition_version_org_position_open_uidx" ON "hr_position_definition_version" USING btree ("organization_id","position_id") WHERE "effective_to" IS NULL AND "lineage_status" = 'active';
--> statement-breakpoint
INSERT INTO "hr_department_structure_version" (
	"id",
	"organization_id",
	"department_id",
	"name",
	"parent_department_id",
	"effective_from",
	"effective_to",
	"supersedes_structure_version_id",
	"lineage_status",
	"reason_code",
	"evidence_ref",
	"version",
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"organization_id",
	"id",
	"name",
	"parent_department_id",
	"created_at"::date,
	NULL,
	NULL,
	'active',
	'initial_record',
	NULL,
	1,
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
FROM "hr_department";
--> statement-breakpoint
INSERT INTO "hr_job_definition_version" (
	"id",
	"organization_id",
	"job_id",
	"title",
	"effective_from",
	"effective_to",
	"supersedes_definition_version_id",
	"lineage_status",
	"reason_code",
	"evidence_ref",
	"version",
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"organization_id",
	"id",
	"title",
	"created_at"::date,
	NULL,
	NULL,
	'active',
	'initial_record',
	NULL,
	1,
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
FROM "hr_job";
--> statement-breakpoint
INSERT INTO "hr_position_definition_version" (
	"id",
	"organization_id",
	"position_id",
	"title",
	"department_id",
	"job_id",
	"effective_from",
	"effective_to",
	"supersedes_definition_version_id",
	"lineage_status",
	"reason_code",
	"evidence_ref",
	"version",
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"organization_id",
	"id",
	"title",
	"department_id",
	"job_id",
	"created_at"::date,
	NULL,
	NULL,
	'active',
	'initial_record',
	NULL,
	1,
	"created_by",
	"updated_by",
	"created_at",
	"updated_at"
FROM "hr_position";
