-- HR-COREORG-DB-INVARIANTS completion (HR-ENT-03 · HR-ENT-16 · Slice 4.10)
-- Effective-date range checks for compensation, benefits, probation, and shift tables.
-- Overlap policies remain command-enforced; see hr-coreorg-db-invariant-exclusion-register.json.

DO $$
DECLARE
	invalid_probation_review_count integer;
	invalid_salary_band_count integer;
	invalid_employee_compensation_count integer;
	invalid_benefit_enrollment_count integer;
	invalid_shift_count integer;
BEGIN
	SELECT COUNT(*)::integer
	INTO invalid_probation_review_count
	FROM hr_probation_review
	WHERE starts_on > ends_on;

	IF invalid_probation_review_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_probation_review has % row(s) with starts_on > ends_on',
			invalid_probation_review_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_salary_band_count
	FROM hr_salary_band
	WHERE effective_to IS NOT NULL
		AND effective_from > effective_to;

	IF invalid_salary_band_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_salary_band has % row(s) with effective_from > effective_to',
			invalid_salary_band_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_employee_compensation_count
	FROM hr_employee_compensation
	WHERE effective_to IS NOT NULL
		AND effective_from > effective_to;

	IF invalid_employee_compensation_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_employee_compensation has % row(s) with effective_from > effective_to',
			invalid_employee_compensation_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_benefit_enrollment_count
	FROM hr_benefit_enrollment
	WHERE effective_to IS NOT NULL
		AND effective_from > effective_to;

	IF invalid_benefit_enrollment_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_benefit_enrollment has % row(s) with effective_from > effective_to',
			invalid_benefit_enrollment_count;
	END IF;

	SELECT COUNT(*)::integer
	INTO invalid_shift_count
	FROM hr_shift
	WHERE effective_to IS NOT NULL
		AND effective_from > effective_to;

	IF invalid_shift_count > 0 THEN
		RAISE EXCEPTION
			'hr_coreorg_db_invariants_preflight: hr_shift has % row(s) with effective_from > effective_to',
			invalid_shift_count;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "hr_probation_review"
	ADD CONSTRAINT "hr_probation_review_effective_range_ck"
	CHECK (starts_on <= ends_on);
--> statement-breakpoint
ALTER TABLE "hr_salary_band"
	ADD CONSTRAINT "hr_salary_band_effective_range_ck"
	CHECK (effective_to IS NULL OR effective_from <= effective_to);
--> statement-breakpoint
ALTER TABLE "hr_employee_compensation"
	ADD CONSTRAINT "hr_employee_compensation_effective_range_ck"
	CHECK (effective_to IS NULL OR effective_from <= effective_to);
--> statement-breakpoint
ALTER TABLE "hr_benefit_enrollment"
	ADD CONSTRAINT "hr_benefit_enrollment_effective_range_ck"
	CHECK (effective_to IS NULL OR effective_from <= effective_to);
--> statement-breakpoint
ALTER TABLE "hr_shift"
	ADD CONSTRAINT "hr_shift_effective_range_ck"
	CHECK (effective_to IS NULL OR effective_from <= effective_to);
