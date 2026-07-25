ALTER TABLE "hr_person" ADD COLUMN "preferred_name" text;
--> statement-breakpoint
ALTER TABLE "hr_person" ADD COLUMN "privacy_classification" text DEFAULT 'workforce_core' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_person" ADD CONSTRAINT "hr_person_privacy_classification_check" CHECK ("privacy_classification" IN ('workforce_core', 'pay_and_benefits', 'medical_and_leave', 'recruitment_and_background', 'employee_relations_and_legal', 'performance_and_talent'));
--> statement-breakpoint
CREATE TABLE "hr_person_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"value_text" text NOT NULL,
	"normalized_value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_contact_type_check" CHECK ("contact_type" IN ('email', 'phone', 'postal_address')),
	CONSTRAINT "hr_person_contact_status_check" CHECK ("status" IN ('active', 'retired'))
);
--> statement-breakpoint
ALTER TABLE "hr_person_contact" ADD CONSTRAINT "hr_person_contact_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_person_idx" ON "hr_person_contact" USING btree ("organization_id","person_id");
--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_id_idx" ON "hr_person_contact" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_person_contact_org_type_normalized_idx" ON "hr_person_contact" USING btree ("organization_id","contact_type","normalized_value");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_contact_org_create_idempotency_uidx" ON "hr_person_contact" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_contact_org_person_type_primary_uidx" ON "hr_person_contact" USING btree ("organization_id","person_id","contact_type") WHERE "status" = 'active' AND "is_primary" = true;
--> statement-breakpoint
CREATE TABLE "hr_person_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"person_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_fingerprint" text NOT NULL,
	"identifier_last4" text NOT NULL,
	"document_ref" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'active' NOT NULL,
	"create_idempotency_key" text NOT NULL,
	"create_request_fingerprint" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_person_identifier_status_check" CHECK ("status" IN ('active', 'retired')),
	CONSTRAINT "hr_person_identifier_date_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
ALTER TABLE "hr_person_identifier" ADD CONSTRAINT "hr_person_identifier_org_person_fk" FOREIGN KEY ("organization_id","person_id") REFERENCES "public"."hr_person"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_person_idx" ON "hr_person_identifier" USING btree ("organization_id","person_id");
--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_id_idx" ON "hr_person_identifier" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_person_identifier_org_type_fingerprint_idx" ON "hr_person_identifier" USING btree ("organization_id","identifier_type","identifier_fingerprint");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identifier_org_create_idempotency_uidx" ON "hr_person_identifier" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_person_identifier_org_type_fingerprint_open_uidx" ON "hr_person_identifier" USING btree ("organization_id","identifier_type","identifier_fingerprint") WHERE "effective_to" IS NULL AND "status" = 'active';
