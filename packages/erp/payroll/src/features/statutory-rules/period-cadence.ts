import { errorResult, type Result } from "@afenda/errors";

/**
 * Where a pay period sits in its tax year.
 *
 * Annualized withholding (Malaysian PCB) cannot be computed without it: the
 * projection multiplies this period's taxable pay by the periods left in the
 * year, and divides the outstanding annual tax back over the same count.
 */
export interface PayrollStatutoryPeriodCadence {
	/** 1-based position of this period inside its tax year. */
	periodOrdinal: number;
	/** How many periods the tax year holds for this pay cadence. */
	periodsPerYear: number;
}

export interface PayrollCadencePeriod {
	periodEnd: string;
	periodStart: string;
}

const MILLISECONDS_PER_DAY = 86_400_000;

function utcDays(isoDate: string): number {
	return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY);
}

function inclusiveLengthDays(period: PayrollCadencePeriod): number {
	return utcDays(period.periodEnd) - utcDays(period.periodStart) + 1;
}

function unclassifiable(detail: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: `Payroll pay-period cadence cannot be established for this tax year (${detail})`,
	});
}

function every(lengths: readonly number[], low: number, high: number): boolean {
	return lengths.every((length) => length >= low && length <= high);
}

/**
 * Periods per year, classified from the SHAPE OF THE WHOLE TAX YEAR's periods.
 *
 * A single period's length cannot carry this. `round(365 / length)` reads a
 * 28-day February as 13 periods a year and the second half of a 31-day month as
 * 23 — both of which over- or under-withhold every annualized tax line in that
 * period. The pay group's own sequence of periods is the evidence: a cadence is
 * recognizable from the SET of lengths it produces across the year, never from
 * one sample.
 *
 * Classes are exactly the handoff pay-frequency vocabulary, because that is the
 * only cadence vocabulary this system admits anywhere:
 *
 * | lengths across the tax year | cadence     | periods/year |
 * |-----------------------------|-------------|--------------|
 * | all 6–8 days                | weekly      | 52           |
 * | all exactly 14 days         | biweekly    | 26           |
 * | all 13–16 days              | semimonthly | 24           |
 * | all 28–31 days              | monthly     | 12           |
 * | all 364–366 days            | annual      | 1            |
 *
 * 14 sits in both the biweekly and the semimonthly window; "all exactly 14"
 * resolves it, since semimonthly halves are 13, 14, 15, and 16 across a year and
 * cannot all be 14. Anything else is a pay calendar this code cannot read, and
 * it refuses instead of picking a number.
 */
export function classifyPeriodsPerYear(
	taxYearPeriods: readonly PayrollCadencePeriod[],
): Result<number> {
	if (taxYearPeriods.length === 0) {
		return unclassifiable("the tax year holds no periods");
	}
	const lengths = taxYearPeriods.map(inclusiveLengthDays);
	if (lengths.some((length) => !Number.isFinite(length) || length < 1)) {
		return unclassifiable("a period has no positive length");
	}
	if (every(lengths, 6, 8)) {
		return errorResult.ok(52);
	}
	if (every(lengths, 14, 14)) {
		return errorResult.ok(26);
	}
	if (every(lengths, 13, 16)) {
		return errorResult.ok(24);
	}
	if (every(lengths, 28, 31)) {
		return errorResult.ok(12);
	}
	if (every(lengths, 364, 366)) {
		return errorResult.ok(1);
	}
	return unclassifiable(
		`period lengths ${[...new Set(lengths)].sort((left, right) => left - right).join("/")} days match no known pay cadence`,
	);
}

/**
 * Cadence for a payroll run's period, from the pay group's own tax-year sequence.
 *
 * The ordinal counts the periods that start earlier in the same tax year, which
 * is exact rather than inferred. Periods per year comes from classifying the
 * whole sequence. A sequence that runs past its own class (a thirteenth monthly
 * period) is a calendar defect and refuses, rather than being widened into a
 * silently different cadence.
 */
export function resolveTaxYearCadence(input: {
	periodStart: string;
	taxYearPeriods: readonly PayrollCadencePeriod[];
}): Result<PayrollStatutoryPeriodCadence> {
	if (
		!input.taxYearPeriods.some(
			(period) => period.periodStart === input.periodStart,
		)
	) {
		return unclassifiable(
			`the period starting ${input.periodStart} is not in its own tax year's sequence`,
		);
	}
	const periodsPerYear = classifyPeriodsPerYear(input.taxYearPeriods);
	if (!periodsPerYear.ok) {
		return periodsPerYear;
	}
	const periodOrdinal =
		input.taxYearPeriods.filter(
			(period) => period.periodStart < input.periodStart,
		).length + 1;
	if (periodOrdinal > periodsPerYear.data) {
		return unclassifiable(
			`period ${periodOrdinal} exceeds the ${periodsPerYear.data} periods this cadence holds`,
		);
	}
	return errorResult.ok({ periodOrdinal, periodsPerYear: periodsPerYear.data });
}
