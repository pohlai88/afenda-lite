CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "payroll_earning_rule"
	ADD CONSTRAINT "payroll_earning_rule_non_archived_range_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"pay_group_id" WITH =,
		"code" WITH =,
		daterange("effective_from", "effective_to", '[]') WITH &&
	)
	WHERE ("status" <> 'archived');
--> statement-breakpoint
ALTER TABLE "payroll_deduction_rule"
	ADD CONSTRAINT "payroll_deduction_rule_non_archived_range_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"pay_group_id" WITH =,
		"code" WITH =,
		daterange("effective_from", "effective_to", '[]') WITH &&
	)
	WHERE ("status" <> 'archived');
--> statement-breakpoint
ALTER TABLE "payroll_statutory_rule"
	ADD CONSTRAINT "payroll_statutory_rule_non_archived_range_excl"
	EXCLUDE USING gist (
		"organization_id" WITH =,
		"pay_group_id" WITH =,
		"code" WITH =,
		daterange("effective_from", "effective_to", '[]') WITH &&
	)
	WHERE ("status" <> 'archived');
