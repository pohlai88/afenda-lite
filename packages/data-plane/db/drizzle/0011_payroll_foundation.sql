-- Phase 2: expand 8 payroll setup/run scaffold tables (additive ALTERs).

ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "timezone" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "code" = 'migrated-' || "id"::text WHERE "code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "name" = 'Migrated calendar' WHERE "name" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "timezone" = 'UTC' WHERE "timezone" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_calendar" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "timezone" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "calendar_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
INSERT INTO "payroll_calendar" (
	"id", "organization_id", "code", "name", "timezone", "status", "effective_from",
	"create_idempotency_key", "create_request_fingerprint", "version", "created_by", "updated_by"
)
SELECT gen_random_uuid(), pg."organization_id", 'migration-default', 'Migration default', 'UTC', 'archived', CURRENT_DATE,
	'migration-cal-' || pg."organization_id", 'migrated', 1, 'migration', 'migration'
FROM (SELECT DISTINCT "organization_id" FROM "payroll_pay_group") pg
WHERE NOT EXISTS (
	SELECT 1 FROM "payroll_calendar" c WHERE c."organization_id" = pg."organization_id"
);
--> statement-breakpoint
UPDATE "payroll_pay_group" pg
SET "calendar_id" = (
	SELECT c."id" FROM "payroll_calendar" c
	WHERE c."organization_id" = pg."organization_id"
	ORDER BY c."created_at"
	LIMIT 1
)
WHERE "calendar_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "code" = 'migrated-' || "id"::text WHERE "code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "name" = 'Migrated pay group' WHERE "name" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_pay_group" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "calendar_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "period_start" date;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "period_end" date;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "cutoff_date" date;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
INSERT INTO "payroll_pay_group" (
	"id", "organization_id", "calendar_id", "code", "name", "currency_code", "status",
	"create_idempotency_key", "create_request_fingerprint", "version", "created_by", "updated_by"
)
SELECT gen_random_uuid(), pp."organization_id",
	(SELECT c."id" FROM "payroll_calendar" c WHERE c."organization_id" = pp."organization_id" ORDER BY c."created_at" LIMIT 1),
	'migration-pg-' || pp."organization_id", 'Migration pay group', 'USD', 'archived',
	'migration-pg-' || pp."organization_id", 'migrated', 1, 'migration', 'migration'
FROM (SELECT DISTINCT "organization_id" FROM "payroll_period") pp
WHERE NOT EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = pp."organization_id"
);
--> statement-breakpoint
UPDATE "payroll_period" pp
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = pp."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "period_start" = CURRENT_DATE WHERE "period_start" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "period_end" = CURRENT_DATE WHERE "period_end" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "cutoff_date" = CURRENT_DATE WHERE "cutoff_date" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "status" = 'closed' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_period" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "period_start" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "period_end" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "cutoff_date" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_period" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "rule_type" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "rate" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_earning_rule" er
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = er."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL AND EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = er."organization_id"
);
--> statement-breakpoint
DELETE FROM "payroll_earning_rule" WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "code" = 'migrated-' || "id"::text WHERE "code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "name" = 'Migrated earning rule' WHERE "name" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "rule_type" = 'fixed' WHERE "rule_type" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "rule_version" = '1' WHERE "rule_version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_earning_rule" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "rule_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "rule_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "rule_type" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "amount" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "rate" numeric(24, 12);
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "currency_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" dr
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = dr."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL AND EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = dr."organization_id"
);
--> statement-breakpoint
DELETE FROM "payroll_deduction_rule" WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "code" = 'migrated-' || "id"::text WHERE "code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "name" = 'Migrated deduction rule' WHERE "name" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "rule_type" = 'fixed' WHERE "rule_type" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "currency_code" = 'USD' WHERE "currency_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "rule_version" = '1' WHERE "rule_version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_deduction_rule" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "rule_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "currency_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "rule_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "code" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "jurisdiction_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "config_json" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "rule_version" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "effective_from" date;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "effective_to" date;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" sr
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = sr."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
)
WHERE "pay_group_id" IS NULL AND EXISTS (
	SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = sr."organization_id"
);
--> statement-breakpoint
DELETE FROM "payroll_statutory_rule" WHERE "pay_group_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "code" = 'migrated-' || "id"::text WHERE "code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "name" = 'Migrated statutory rule' WHERE "name" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "jurisdiction_code" = 'generic' WHERE "jurisdiction_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "config_json" = '{}'::jsonb WHERE "config_json" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "rule_version" = '1' WHERE "rule_version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "status" = 'archived' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "effective_from" = CURRENT_DATE WHERE "effective_from" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_statutory_rule" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "jurisdiction_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "config_json" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "rule_version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "effective_from" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "pay_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "period_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "run_type" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "sequence" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "finalized_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "finalized_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "calculation_snapshot_hash" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "create_idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "create_request_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
UPDATE "payroll_run" r
SET "pay_group_id" = (
	SELECT g."id" FROM "payroll_pay_group" g
	WHERE g."organization_id" = r."organization_id"
	ORDER BY g."created_at"
	LIMIT 1
),
"period_id" = (
	SELECT p."id" FROM "payroll_period" p
	WHERE p."organization_id" = r."organization_id"
	ORDER BY p."created_at"
	LIMIT 1
)
WHERE ("pay_group_id" IS NULL OR "period_id" IS NULL)
AND EXISTS (SELECT 1 FROM "payroll_pay_group" g WHERE g."organization_id" = r."organization_id")
AND EXISTS (SELECT 1 FROM "payroll_period" p WHERE p."organization_id" = r."organization_id");
--> statement-breakpoint
DELETE FROM "payroll_run" WHERE "pay_group_id" IS NULL OR "period_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "run_type" = 'regular' WHERE "run_type" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "sequence" = 1 WHERE "sequence" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "status" = 'draft' WHERE "status" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "create_idempotency_key" = 'migrated-' || "id"::text WHERE "create_idempotency_key" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "create_request_fingerprint" = 'migrated' WHERE "create_request_fingerprint" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "version" = 1 WHERE "version" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "payroll_run" SET "updated_by" = 'migration' WHERE "updated_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "pay_group_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "period_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "run_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "sequence" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "create_idempotency_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "create_request_fingerprint" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_run" ALTER COLUMN "updated_by" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "run_id" uuid;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "severity" text;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "exception_code" text;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "message" text;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "employee_ref" text;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
UPDATE "payroll_exception" e
SET "run_id" = (
	SELECT r."id" FROM "payroll_run" r
	WHERE r."organization_id" = e."organization_id"
	ORDER BY r."created_at"
	LIMIT 1
)
WHERE "run_id" IS NULL AND EXISTS (
	SELECT 1 FROM "payroll_run" r WHERE r."organization_id" = e."organization_id"
);
--> statement-breakpoint
DELETE FROM "payroll_exception" WHERE "run_id" IS NULL;
--> statement-breakpoint
UPDATE "payroll_exception" SET "severity" = 'warning' WHERE "severity" IS NULL;
--> statement-breakpoint
UPDATE "payroll_exception" SET "exception_code" = 'migrated' WHERE "exception_code" IS NULL;
--> statement-breakpoint
UPDATE "payroll_exception" SET "message" = 'Migrated exception' WHERE "message" IS NULL;
--> statement-breakpoint
UPDATE "payroll_exception" SET "created_by" = 'migration' WHERE "created_by" IS NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ALTER COLUMN "run_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ALTER COLUMN "severity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ALTER COLUMN "exception_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ALTER COLUMN "message" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ALTER COLUMN "created_by" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_calendar_org_id_uidx" ON "payroll_calendar" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_calendar_org_id_idx" ON "payroll_calendar" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_calendar_org_status_idx" ON "payroll_calendar" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_calendar_org_create_idempotency_uidx" ON "payroll_calendar" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_calendar_org_code_from_uidx" ON "payroll_calendar" USING btree ("organization_id","code","effective_from");
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD CONSTRAINT "payroll_calendar_status_check" CHECK ("status" IN ('active', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_calendar" ADD CONSTRAINT "payroll_calendar_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_pay_group_org_id_uidx" ON "payroll_pay_group" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_pay_group_org_id_idx" ON "payroll_pay_group" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_pay_group_org_calendar_idx" ON "payroll_pay_group" USING btree ("organization_id","calendar_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_pay_group_org_code_uidx" ON "payroll_pay_group" USING btree ("organization_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_pay_group_org_create_idempotency_uidx" ON "payroll_pay_group" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD CONSTRAINT "payroll_pay_group_org_calendar_fk" FOREIGN KEY ("organization_id","calendar_id") REFERENCES "public"."payroll_calendar"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_pay_group" ADD CONSTRAINT "payroll_pay_group_status_check" CHECK ("status" IN ('active', 'archived'));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_period_org_id_uidx" ON "payroll_period" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_period_org_id_idx" ON "payroll_period" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_period_org_pay_group_idx" ON "payroll_period" USING btree ("organization_id","pay_group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_period_org_pay_group_range_uidx" ON "payroll_period" USING btree ("organization_id","pay_group_id","period_start","period_end");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_period_org_create_idempotency_uidx" ON "payroll_period" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_status_check" CHECK ("status" IN ('open', 'closed'));
--> statement-breakpoint
ALTER TABLE "payroll_period" ADD CONSTRAINT "payroll_period_range_check" CHECK ("period_end" >= "period_start");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_earning_rule_org_id_uidx" ON "payroll_earning_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_earning_rule_org_id_idx" ON "payroll_earning_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_earning_rule_org_pay_group_idx" ON "payroll_earning_rule" USING btree ("organization_id","pay_group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_earning_rule_org_code_from_uidx" ON "payroll_earning_rule" USING btree ("organization_id","pay_group_id","code","effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_earning_rule_org_create_idempotency_uidx" ON "payroll_earning_rule" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD CONSTRAINT "payroll_earning_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD CONSTRAINT "payroll_earning_rule_type_check" CHECK ("rule_type" IN ('fixed', 'rate'));
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD CONSTRAINT "payroll_earning_rule_status_check" CHECK ("status" IN ('active', 'superseded', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule" ADD CONSTRAINT "payroll_earning_rule_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_deduction_rule_org_id_uidx" ON "payroll_deduction_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deduction_rule_org_id_idx" ON "payroll_deduction_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deduction_rule_org_pay_group_idx" ON "payroll_deduction_rule" USING btree ("organization_id","pay_group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_deduction_rule_org_code_from_uidx" ON "payroll_deduction_rule" USING btree ("organization_id","pay_group_id","code","effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_deduction_rule_org_create_idempotency_uidx" ON "payroll_deduction_rule" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_type_check" CHECK ("rule_type" IN ('fixed', 'rate'));
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_status_check" CHECK ("status" IN ('active', 'superseded', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule" ADD CONSTRAINT "payroll_deduction_rule_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_statutory_rule_org_id_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_statutory_rule_org_id_idx" ON "payroll_statutory_rule" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_statutory_rule_org_pay_group_idx" ON "payroll_statutory_rule" USING btree ("organization_id","pay_group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_statutory_rule_org_code_from_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","pay_group_id","code","effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_statutory_rule_org_create_idempotency_uidx" ON "payroll_statutory_rule" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD CONSTRAINT "payroll_statutory_rule_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD CONSTRAINT "payroll_statutory_rule_status_check" CHECK ("status" IN ('active', 'superseded', 'archived'));
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule" ADD CONSTRAINT "payroll_statutory_rule_effective_range_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_run_org_id_uidx" ON "payroll_run" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_run_org_id_idx" ON "payroll_run" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_run_org_status_idx" ON "payroll_run" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_run_org_pay_group_idx" ON "payroll_run" USING btree ("organization_id","pay_group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_run_org_period_idx" ON "payroll_run" USING btree ("organization_id","period_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_run_org_identity_uidx" ON "payroll_run" USING btree ("organization_id","pay_group_id","period_id","run_type","sequence");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_run_org_create_idempotency_uidx" ON "payroll_run" USING btree ("organization_id","create_idempotency_key");
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_org_pay_group_fk" FOREIGN KEY ("organization_id","pay_group_id") REFERENCES "public"."payroll_pay_group"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_org_period_fk" FOREIGN KEY ("organization_id","period_id") REFERENCES "public"."payroll_period"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_type_check" CHECK ("run_type" IN ('regular', 'off_cycle', 'adjustment'));
--> statement-breakpoint
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_status_check" CHECK ("status" IN ('draft', 'calculating', 'calculated', 'failed', 'finalized', 'reversed'));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_exception_org_id_uidx" ON "payroll_exception" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_exception_org_id_idx" ON "payroll_exception" USING btree ("organization_id","id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_exception_org_run_idx" ON "payroll_exception" USING btree ("organization_id","run_id");
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD CONSTRAINT "payroll_exception_org_run_fk" FOREIGN KEY ("organization_id","run_id") REFERENCES "public"."payroll_run"("organization_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payroll_exception" ADD CONSTRAINT "payroll_exception_severity_check" CHECK ("severity" IN ('blocking', 'warning'));
