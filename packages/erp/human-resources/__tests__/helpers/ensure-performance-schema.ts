import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { database as afendaDatabase } from "@afenda/db";

const migrationPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../fixtures/hr-performance-schema.sql",
);

const migrationHash = createHash("sha256")
	.update(readFileSync(migrationPath))
	.digest("hex");

const migrationStatements = readFileSync(migrationPath, "utf8")
	.split(/--> statement-breakpoint\n/)
	.map((statement) => statement.trim())
	.filter((statement) => statement.length > 0);

let ensured = false;

async function ensurePerformanceCycleConfigurationTables(): Promise<void> {
	await afendaDatabase.transaction((sql) => [
		sql`
			ALTER TABLE "hr_performance_cycle"
				DROP CONSTRAINT IF EXISTS "hr_performance_cycle_status_check"
		`,
		sql`
			ALTER TABLE "hr_performance_cycle"
				ADD CONSTRAINT "hr_performance_cycle_status_check"
				CHECK ("status" IN ('draft', 'published', 'open', 'closed', 'cancelled'))
		`,
		sql`
			ALTER TABLE "hr_performance_goal"
				ADD COLUMN IF NOT EXISTS "goal_kind" text DEFAULT 'employee' NOT NULL
		`,
		sql`
			ALTER TABLE "hr_performance_goal"
				ADD COLUMN IF NOT EXISTS "aligned_to_goal_id" uuid
		`,
		sql`
			ALTER TABLE "hr_performance_goal"
				ADD COLUMN IF NOT EXISTS "completion_note" text
		`,
		sql`
			ALTER TABLE "hr_performance_goal"
				ADD COLUMN IF NOT EXISTS "completion_evidence_reference" text
		`,
		sql`
			ALTER TABLE "hr_performance_review_participant"
				ADD COLUMN IF NOT EXISTS "sequence_number" integer DEFAULT 0
		`,
		sql`
			UPDATE "hr_performance_review_participant"
			SET "sequence_number" = CASE
				WHEN "role" = 'self' THEN 1
				WHEN "role" = 'manager' THEN 2
				ELSE 3
			END
			WHERE "sequence_number" IS NULL
		`,
		sql`
			ALTER TABLE "hr_performance_review_participant"
				ALTER COLUMN "sequence_number" SET NOT NULL
		`,
		sql`
			CREATE INDEX IF NOT EXISTS "hr_performance_goal_org_aligned_idx"
				ON "hr_performance_goal" ("organization_id", "aligned_to_goal_id")
		`,
		sql`
			ALTER TABLE "hr_performance_goal_progress"
				ADD COLUMN IF NOT EXISTS "evidence_reference" text
		`,
		sql`
			ALTER TABLE "hr_performance_review"
				ADD COLUMN IF NOT EXISTS "calibration_note" text
		`,
		sql`
			ALTER TABLE "hr_performance_assessment"
				ADD COLUMN IF NOT EXISTS "participant_id" uuid
		`,
		sql`
			UPDATE "hr_performance_assessment" AS assessment
			SET "participant_id" = participant."id"
			FROM "hr_performance_review_participant" AS participant
			WHERE assessment."review_id" = participant."review_id"
				AND assessment."organization_id" = participant."organization_id"
				AND assessment."kind" = participant."role"
				AND assessment."participant_id" IS NULL
		`,
		sql`
			DROP INDEX IF EXISTS "hr_performance_assessment_org_review_kind_uidx"
		`,
		sql`
			CREATE UNIQUE INDEX IF NOT EXISTS "hr_performance_assessment_org_review_participant_uidx"
				ON "hr_performance_assessment" ("organization_id", "review_id", "participant_id")
		`,
		sql`
			ALTER TABLE "hr_performance_improvement_checkpoint"
				ADD COLUMN IF NOT EXISTS "evidence_reference" text
		`,
		sql`
			ALTER TABLE "hr_performance_improvement_plan"
				ADD COLUMN IF NOT EXISTS "outcome_evidence_reference" text
		`,
		sql`
			ALTER TABLE "hr_performance_improvement_plan"
				ADD COLUMN IF NOT EXISTS "outcome_reason" text
		`,
		sql`
			ALTER TABLE "hr_performance_improvement_plan"
				ADD COLUMN IF NOT EXISTS "last_extension_evidence_reference" text
		`,
		sql`
			ALTER TABLE "hr_performance_improvement_plan"
				ADD COLUMN IF NOT EXISTS "last_extension_reason" text
		`,
		sql`
			CREATE TABLE IF NOT EXISTS "hr_performance_cycle_review_period" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" text NOT NULL,
				"cycle_id" uuid NOT NULL,
				"kind" text NOT NULL,
				"period_start" date NOT NULL,
				"period_end" date NOT NULL,
				"created_by" text NOT NULL,
				"updated_by" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL,
				"updated_at" timestamp with time zone DEFAULT now() NOT NULL
			)
		`,
		sql`
			CREATE TABLE IF NOT EXISTS "hr_performance_cycle_eligibility" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" text NOT NULL,
				"cycle_id" uuid NOT NULL,
				"min_tenure_days" integer,
				"allowed_employment_statuses" text NOT NULL,
				"created_by" text NOT NULL,
				"updated_by" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL,
				"updated_at" timestamp with time zone DEFAULT now() NOT NULL
			)
		`,
		sql`
			CREATE INDEX IF NOT EXISTS "hr_performance_cycle_review_period_org_id_idx"
				ON "hr_performance_cycle_review_period" ("organization_id", "id")
		`,
		sql`
			CREATE INDEX IF NOT EXISTS "hr_performance_cycle_review_period_org_cycle_idx"
				ON "hr_performance_cycle_review_period" ("organization_id", "cycle_id")
		`,
		sql`
			CREATE UNIQUE INDEX IF NOT EXISTS "hr_performance_cycle_review_period_org_cycle_kind_uidx"
				ON "hr_performance_cycle_review_period" ("organization_id", "cycle_id", "kind")
		`,
		sql`
			CREATE INDEX IF NOT EXISTS "hr_performance_cycle_eligibility_org_id_idx"
				ON "hr_performance_cycle_eligibility" ("organization_id", "id")
		`,
		sql`
			CREATE UNIQUE INDEX IF NOT EXISTS "hr_performance_cycle_eligibility_org_cycle_uidx"
				ON "hr_performance_cycle_eligibility" ("organization_id", "cycle_id")
		`,
		sql`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_cycle_review_period_cycle_id_hr_performance_cycle_id_fk'
				) THEN
					ALTER TABLE "hr_performance_cycle_review_period"
						ADD CONSTRAINT "hr_performance_cycle_review_period_cycle_id_hr_performance_cycle_id_fk"
						FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id");
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_cycle_review_period_kind_check'
				) THEN
					ALTER TABLE "hr_performance_cycle_review_period"
						ADD CONSTRAINT "hr_performance_cycle_review_period_kind_check"
						CHECK ("kind" IN ('goal_setting', 'self_review', 'manager_review', 'calibration'));
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_cycle_review_period_range_check'
				) THEN
					ALTER TABLE "hr_performance_cycle_review_period"
						ADD CONSTRAINT "hr_performance_cycle_review_period_range_check"
						CHECK ("period_end" >= "period_start");
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_cycle_eligibility_cycle_id_hr_performance_cycle_id_fk'
				) THEN
					ALTER TABLE "hr_performance_cycle_eligibility"
						ADD CONSTRAINT "hr_performance_cycle_eligibility_cycle_id_hr_performance_cycle_id_fk"
						FOREIGN KEY ("cycle_id") REFERENCES "public"."hr_performance_cycle"("id");
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_goal_goal_kind_check'
				) THEN
					ALTER TABLE "hr_performance_goal"
						ADD CONSTRAINT "hr_performance_goal_goal_kind_check"
						CHECK ("goal_kind" IN ('employee', 'manager'));
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_goal_aligned_to_goal_id_hr_performance_goal_id_fk'
				) THEN
					ALTER TABLE "hr_performance_goal"
						ADD CONSTRAINT "hr_performance_goal_aligned_to_goal_id_hr_performance_goal_id_fk"
						FOREIGN KEY ("aligned_to_goal_id") REFERENCES "public"."hr_performance_goal"("id");
				END IF;
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'hr_performance_assessment_participant_id_hr_performance_review_participant_id_fk'
				) THEN
					ALTER TABLE "hr_performance_assessment"
						ADD CONSTRAINT "hr_performance_assessment_participant_id_hr_performance_review_participant_id_fk"
						FOREIGN KEY ("participant_id") REFERENCES "public"."hr_performance_review_participant"("id");
				END IF;
				ALTER TABLE "hr_performance_assessment"
					DROP CONSTRAINT IF EXISTS "hr_performance_assessment_kind_check";
				ALTER TABLE "hr_performance_assessment"
					ADD CONSTRAINT "hr_performance_assessment_kind_check"
					CHECK ("kind" IN ('self', 'manager', 'delegated'));
			END $$;
		`,
	]);
}

/** Apply HR performance DDL when Drizzle parity runs against a DB missing performance tables. */
export async function ensurePerformanceSchemaForTests(): Promise<void> {
	if (ensured) {
		return;
	}

	const [exists] = await afendaDatabase.transaction((sql) => [
		sql`
			SELECT EXISTS (
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = 'public'
					AND table_name = 'hr_performance_cycle'
			) AS exists
		`,
	]);
	if (exists[0]?.exists) {
		await ensurePerformanceCycleConfigurationTables();
		ensured = true;
		return;
	}

	await afendaDatabase.transaction((sql) => [
		...migrationStatements.map((statement) => sql.query(statement)),
	]);
	await ensurePerformanceCycleConfigurationTables();

	await afendaDatabase.transaction((sql) => [
		sql`
			INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
			SELECT ${migrationHash}, ${1_784_900_000_000}
			WHERE NOT EXISTS (
				SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${migrationHash}
			)
		`,
	]);

	ensured = true;
}
