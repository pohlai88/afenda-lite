CREATE TABLE "hr_person_identity_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_identity_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_identity_version_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_person_identity_version_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_worker_classification_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"worker_type" text NOT NULL,
	"employee_id" uuid,
	"worker_status" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"supersedes_classification_version_id" uuid,
	"lineage_status" text NOT NULL,
	"reason_code" text NOT NULL,
	"evidence_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_worker_classification_version_type_check" CHECK ("worker_type" IN ('employee', 'contractor', 'contingent_worker', 'intern')),
	CONSTRAINT "hr_worker_classification_version_worker_status_check" CHECK ("worker_status" IN ('active', 'inactive', 'former')),
	CONSTRAINT "hr_worker_classification_version_lineage_status_check" CHECK ("lineage_status" IN ('active', 'superseded')),
	CONSTRAINT "hr_worker_classification_version_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "hr_worker_classification_version_employee_id_check" CHECK (("worker_type" = 'employee') OR ("employee_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "hr_person_identity_version" ADD CONSTRAINT "hr_person_identity_version_supersedes_identity_version_id_hr_person_identity_version_id_fk" FOREIGN KEY ("supersedes_identity_version_id") REFERENCES "public"."hr_person_identity_version"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_supersedes_classification_version_id_hr_worker_classification_version_id_fk" FOREIGN KEY ("supersedes_classification_version_id") REFERENCES "public"."hr_worker_classification_version"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_person_identity_version" ADD CONSTRAINT "hr_person_identity_version_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_org_worker_fk" FOREIGN KEY ("organization_id","worker_id") REFERENCES "public"."hr_worker"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_worker_classification_version" ADD CONSTRAINT "hr_worker_classification_version_org_employee_fk" FOREIGN KEY ("organization_id","employee_id") REFERENCES "public"."hr_employee"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_person_identity_version_org_person_idx" ON "hr_person_identity_version" USING btree ("organization_id","person_id");
--> statement-breakpoint
CREATE INDEX "hr_person_identity_version_org_id_idx" ON "hr_person_identity_version" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identity_version_org_person_open_uidx" ON "hr_person_identity_version" USING btree ("organization_id","person_id") WHERE "effective_to" IS NULL AND "lineage_status" = 'active';
--> statement-breakpoint
CREATE INDEX "hr_worker_classification_version_org_worker_idx" ON "hr_worker_classification_version" USING btree ("organization_id","worker_id");
--> statement-breakpoint
CREATE INDEX "hr_worker_classification_version_org_id_idx" ON "hr_worker_classification_version" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_worker_classification_version_org_worker_open_uidx" ON "hr_worker_classification_version" USING btree ("organization_id","worker_id") WHERE "effective_to" IS NULL AND "lineage_status" = 'active';
--> statement-breakpoint
INSERT INTO "hr_person_identity_version" (
	"id",
	"organization_id",
	"person_id",
	"legal_name",
	"effective_from",
	"effective_to",
	"supersedes_identity_version_id",
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
	"legal_name",
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
FROM "hr_person";
--> statement-breakpoint
INSERT INTO "hr_worker_classification_version" (
	"id",
	"organization_id",
	"worker_id",
	"worker_type",
	"employee_id",
	"worker_status",
	"effective_from",
	"effective_to",
	"supersedes_classification_version_id",
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
	"worker_type",
	"employee_id",
	"status",
	"effective_from",
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
FROM "hr_worker";
