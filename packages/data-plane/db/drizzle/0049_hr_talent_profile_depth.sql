CREATE TABLE "hr_talent_profile_mobility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"talent_profile_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"preference_code" text NOT NULL,
	"scope_detail" text,
	"evidence_summary" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_profile_mobility_dimension_check" CHECK ("dimension" IN ('geographic', 'functional', 'organizational')),
	CONSTRAINT "hr_talent_profile_mobility_preference_code_check" CHECK ("preference_code" IN ('open', 'limited', 'not_open')),
	CONSTRAINT "hr_talent_profile_mobility_status_check" CHECK ("status" IN ('current', 'superseded')),
	CONSTRAINT "hr_talent_profile_mobility_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
CREATE TABLE "hr_talent_critical_role_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"talent_profile_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"readiness" text NOT NULL,
	"readiness_effective_on" date NOT NULL,
	"evidence_summary" text NOT NULL,
	"assessor_user_id" text NOT NULL,
	"status" text NOT NULL,
	"create_idempotency_key" text,
	"create_request_fingerprint" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_talent_critical_role_readiness_status_check" CHECK ("status" IN ('current', 'superseded')),
	CONSTRAINT "hr_talent_critical_role_readiness_readiness_check" CHECK ("readiness" IN ('not_ready', 'ready_soon', 'ready_now', 'emerging'))
);
--> statement-breakpoint
ALTER TABLE "hr_talent_profile_mobility" ADD CONSTRAINT "hr_talent_profile_mobility_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_talent_critical_role_readiness" ADD CONSTRAINT "hr_talent_critical_role_readiness_talent_profile_id_hr_talent_profile_id_fk" FOREIGN KEY ("talent_profile_id") REFERENCES "public"."hr_talent_profile"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "hr_talent_critical_role_readiness" ADD CONSTRAINT "hr_talent_critical_role_readiness_position_id_hr_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."hr_position"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_talent_profile_mobility_org_id_idx" ON "hr_talent_profile_mobility" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_talent_profile_mobility_org_profile_idx" ON "hr_talent_profile_mobility" USING btree ("organization_id","talent_profile_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_mobility_org_profile_dimension_current_uidx" ON "hr_talent_profile_mobility" USING btree ("organization_id","talent_profile_id","dimension") WHERE "hr_talent_profile_mobility"."status" = 'current';
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_profile_mobility_org_create_idempotency_uidx" ON "hr_talent_profile_mobility" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_profile_mobility"."create_idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_id_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_profile_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","talent_profile_id");
--> statement-breakpoint
CREATE INDEX "hr_talent_critical_role_readiness_org_position_idx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","position_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_critical_role_readiness_org_profile_position_current_uidx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","talent_profile_id","position_id") WHERE "hr_talent_critical_role_readiness"."status" = 'current';
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_talent_critical_role_readiness_org_create_idempotency_uidx" ON "hr_talent_critical_role_readiness" USING btree ("organization_id","create_idempotency_key") WHERE "hr_talent_critical_role_readiness"."create_idempotency_key" IS NOT NULL;
