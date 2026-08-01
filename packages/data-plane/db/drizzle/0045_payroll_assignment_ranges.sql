CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "payroll_employee_assignment"
	ADD CONSTRAINT "payroll_employee_assignment_active_range_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"employee_id" WITH =,
		daterange("effective_from", "effective_to", '[]') WITH &&
	)
	WHERE ("status" = 'active');
