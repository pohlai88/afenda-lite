-- Phase 4: expand assignment and input scaffold tables (additive ALTERs).

ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "employee_id" = 'migrated-' || "id"::text WHERE "employee_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_employee_assignment" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "employee_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "payroll_pay_group" (
	"id", "organization_id", "calendar_id", "code", "name", "currency_code", "status",
	"create_idempotency_key", "create_request_fingerprint", "version", "created_by", "updated_by"
)
SELECT gen_random_uuid(), pea."organization_id",
	(SELECT c."id" FROM "payroll_calendar" c WHERE c."organization_id" = pea."organization_id" ORDER BY c."created_at" LIMIT 1),
	'migration-pg-' || pea."organization_id", 'Migration pay group', 'USD', 'archived',
	'migration-pg-' || pea."organization_id", 'migrated', 1, 'migration', 'migration'
FROM (SELECT DISTINCT "organization_id" FROM "payroll_employee_assignment") pea
WHERE NOT EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = pea."organization_id"
);
--> statement-breakpoint
UPDATE "payroll_employee_assignment" pea
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = pea."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
DELETE FROM "payroll_employee_assignment" WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_employee_assignment_org_id_uidx" ON "payroll_employee_assignment" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_employee_assignment_org_create_idempotency_uidx" ON "payroll_employee_assignment" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_employee_assignment_org_employee_from_uidx" ON "payroll_employee_assignment" USING btree ("organization_id","employee_id","effective_from");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_employee_assignment_org_employee_idx" ON "payroll_employee_assignment" USING btree ("organization_id","employee_id");
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD CONSTRAINT "payroll_employee_assignment_status_check" CHECK ("status" IN ('active', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD CONSTRAINT "payroll_employee_assignment_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment" ADD CONSTRAINT "payroll_employee_assignment_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "assignment_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "earning_rule_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "employee_id" = 'migrated-' || "id"::text WHERE "employee_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "amount" = 0 WHERE "amount" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_earning" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "employee_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
DELETE FROM "payroll_recurring_earning" WHERE "assignment_id" IS NULL OR "earning_rule_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "assignment_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ALTER COLUMN "earning_rule_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_recurring_earning_org_id_uidx" ON "payroll_recurring_earning" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_recurring_earning_org_create_idempotency_uidx" ON "payroll_recurring_earning" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_recurring_earning_org_assignment_idx" ON "payroll_recurring_earning" USING btree ("organization_id","assignment_id");
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_status_check" CHECK ("status" IN ('active', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_assignment_fk" FOREIGN KEY ("organization_id","assignment_id") REFERENCES "public"."payroll_employee_assignment"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_earning" ADD CONSTRAINT "payroll_recurring_earning_org_earning_rule_fk" FOREIGN KEY ("organization_id","earning_rule_id") REFERENCES "public"."payroll_earning_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "assignment_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "deduction_rule_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "employee_id" = 'migrated-' || "id"::text WHERE "employee_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "amount" = 0 WHERE "amount" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_recurring_deduction" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "employee_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
DELETE FROM "payroll_recurring_deduction" WHERE "assignment_id" IS NULL OR "deduction_rule_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "assignment_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ALTER COLUMN "deduction_rule_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_recurring_deduction_org_id_uidx" ON "payroll_recurring_deduction" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_recurring_deduction_org_create_idempotency_uidx" ON "payroll_recurring_deduction" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_recurring_deduction_org_assignment_idx" ON "payroll_recurring_deduction" USING btree ("organization_id","assignment_id");
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_status_check" CHECK ("status" IN ('active', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_assignment_fk" FOREIGN KEY ("organization_id","assignment_id") REFERENCES "public"."payroll_employee_assignment"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_recurring_deduction" ADD CONSTRAINT "payroll_recurring_deduction_org_deduction_rule_fk" FOREIGN KEY ("organization_id","deduction_rule_id") REFERENCES "public"."payroll_deduction_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "employee_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "period_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "earning_rule_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "earning_rule_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "earning_rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "source_type" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "source_id" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "source_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "employee_id" = 'migrated-' || "id"::text WHERE "employee_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "earning_rule_code" = 'MIGRATED' WHERE "earning_rule_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "earning_rule_version" = '0' WHERE "earning_rule_version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "amount" = 0 WHERE "amount" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "source_type" = 'migration' WHERE "source_type" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "source_id" = 'migrated-' || "id"::text WHERE "source_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "source_request_fingerprint" = 'migrated' WHERE "source_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "status" = 'cancelled' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "employee_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "earning_rule_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "earning_rule_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "amount" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "source_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "source_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "source_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "payroll_pay_group" (
	"id", "organization_id", "calendar_id", "code", "name", "currency_code", "status",
	"create_idempotency_key", "create_request_fingerprint", "version", "created_by", "updated_by"
)
SELECT gen_random_uuid(), pvi."organization_id",
	(SELECT c."id" FROM "payroll_calendar" c WHERE c."organization_id" = pvi."organization_id" ORDER BY c."created_at" LIMIT 1),
	'migration-pg-' || pvi."organization_id", 'Migration pay group', 'USD', 'archived',
	'migration-pg-' || pvi."organization_id", 'migrated', 1, 'migration', 'migration'
FROM (SELECT DISTINCT "organization_id" FROM "payroll_variable_input") pvi
WHERE NOT EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = pvi."organization_id"
);
--> statement-breakpoint
UPDATE "payroll_variable_input" pvi
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = pvi."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" pvi
SET "period_id" = (
	SELECT p."id" FROM "payroll_period" p
	WHERE p."organization_id" = pvi."organization_id"
		AND p."pay_group_id" = pvi."pay_group_id"
	ORDER BY p."period_start"
	LIMIT 1
)
WHERE "period_id" IS NULL AND "pay_group_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "payroll_variable_input" pvi
SET "earning_rule_id" = (
	SELECT r."id" FROM "payroll_earning_rule" r
	WHERE r."organization_id" = pvi."organization_id"
		AND r."pay_group_id" = pvi."pay_group_id"
	ORDER BY r."created_at"
	LIMIT 1
)
WHERE "earning_rule_id" IS NULL AND "pay_group_id" IS NOT NULL;
--> statement-breakpoint
DELETE FROM "payroll_variable_input"
WHERE "pay_group_id" IS NULL OR "period_id" IS NULL OR "earning_rule_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "period_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ALTER COLUMN "earning_rule_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_variable_input_org_id_uidx" ON "payroll_variable_input" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_variable_input_org_source_uidx" ON "payroll_variable_input" USING btree ("organization_id","source_type","source_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_variable_input_org_create_idempotency_uidx" ON "payroll_variable_input" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_variable_input_org_period_idx" ON "payroll_variable_input" USING btree ("organization_id","period_id");
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_status_check" CHECK ("status" IN ('accepted', 'superseded', 'cancelled'));
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_period_fk" FOREIGN KEY ("organization_id","period_id") REFERENCES "public"."payroll_period"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_variable_input" ADD CONSTRAINT "payroll_variable_input_org_earning_rule_fk" FOREIGN KEY ("organization_id","earning_rule_id") REFERENCES "public"."payroll_earning_rule"("organization_id","id") ON DELETE no action ON UPDATE no action;
