ALTER TABLE "hr_work_calendar_holiday"
	ADD COLUMN IF NOT EXISTS "override_kind" text NOT NULL DEFAULT 'holiday',
	ADD COLUMN IF NOT EXISTS "is_working_day" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "expected_minutes" integer;
--> statement-breakpoint
ALTER TABLE "hr_work_calendar_holiday"
	ADD CONSTRAINT "hr_work_calendar_holiday_override_kind_check"
	CHECK ("override_kind" IN (
		'holiday',
		'half_day',
		'shortened_day',
		'replacement_workday',
		'closure'
	));
--> statement-breakpoint
ALTER TABLE "hr_work_calendar_holiday"
	ADD CONSTRAINT "hr_work_calendar_holiday_expected_minutes_pos_check"
	CHECK ("expected_minutes" IS NULL OR "expected_minutes" > 0);
--> statement-breakpoint
ALTER TABLE "hr_work_calendar_holiday"
	ADD CONSTRAINT "hr_work_calendar_holiday_override_consistency_check"
	CHECK (
		(
			"override_kind" IN ('holiday', 'closure')
			AND "is_working_day" = false
		)
		OR (
			"override_kind" IN ('half_day', 'shortened_day', 'replacement_workday')
			AND "is_working_day" = true
		)
	);
