-- HR-COREORG-DB-INVARIANTS (HR-ENT-03 · HR-ENT-16)
-- Effective-date range checks for core organization temporal tables.
-- Overlap policies remain command-enforced; see hr-coreorg-db-invariant-exclusion-register.json.

DO $$
DECLARE
	invalid_work_assignment_count integer;
	invalid_employment_contract_count integer;
	invalid_reporting_line_count integer;
BEGIN
	SELECT COUNT(*)::integer
	INTO invalid_work_assignment_count
	FROM hr_work_assignment
	WHERE ends_on IS NOT NULL
		AND starts_on > ends_on;

	IF invalid_work_assignment_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_work_assignment has % row(s) with starts_on > ends_on',
			invalid_work_assignment_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_employment_contract_count
	FROM hr_employment_contract
	WHERE ends_on IS NOT NULL
		AND starts_on > ends_on;

	IF invalid_employment_contract_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_employment_contract has % row(s) with starts_on > ends_on',
			invalid_employment_contract_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_reporting_line_count
	FROM hr_reporting_line
	WHERE ends_on IS NOT NULL
		AND starts_on > ends_on;

	IF invalid_reporting_line_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_reporting_line has % row(s) with starts_on > ends_on',
			invalid_reporting_line_count;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "hr_work_assignment"
	ADD CONSTRAINT "hr_work_assignment_effective_range_ck"
	CHECK (ends_on IS NULL OR starts_on <= ends_on);
--> statement-breakpoint
ALTER TABLE "hr_employment_contract"
	ADD CONSTRAINT "hr_employment_contract_effective_range_ck"
	CHECK (ends_on IS NULL OR starts_on <= ends_on);
--> statement-breakpoint
ALTER TABLE "hr_reporting_line"
	ADD CONSTRAINT "hr_reporting_line_effective_range_ck"
	CHECK (ends_on IS NULL OR starts_on <= ends_on);
