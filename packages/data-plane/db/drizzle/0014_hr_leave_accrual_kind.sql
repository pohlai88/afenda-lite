ALTER TABLE "hr_leave_adjustment"
	DROP CONSTRAINT "hr_leave_adjustment_kind_check";
--> statement-breakpoint
ALTER TABLE "hr_leave_adjustment"
	ADD CONSTRAINT "hr_leave_adjustment_kind_check"
	CHECK ("kind" IN ('manual', 'accrual', 'carry_forward', 'expiry', 'consumption', 'cancellation_reversal'));
