ALTER TABLE "hr_attendance_event" ADD COLUMN IF NOT EXISTS "source_sequence" integer;--> statement-breakpoint
UPDATE "hr_attendance_event" AS event
SET "source_sequence" = ranked.row_num - 1
FROM (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "organization_id", "employee_id", "local_work_date"
			ORDER BY "occurred_at", "id"
		) AS row_num
	FROM "hr_attendance_event"
) AS ranked
WHERE event."id" = ranked."id"
	AND event."source_sequence" IS NULL;--> statement-breakpoint
ALTER TABLE "hr_attendance_event" ALTER COLUMN "source_sequence" SET NOT NULL;
