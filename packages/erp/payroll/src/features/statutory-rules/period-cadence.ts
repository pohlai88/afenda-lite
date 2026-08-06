import type { HandoffPayFrequency } from "@afenda/events/schemas";

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

const DAYS_PER_YEAR = 365;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Periods per year for the closed handoff pay-frequency vocabulary. Semimonthly
 * is 24 by construction (two per calendar month), not 365/15.
 */
export const PAY_FREQUENCY_PERIODS_PER_YEAR: Record<
	HandoffPayFrequency,
	number
> = {
	weekly: 52,
	biweekly: 26,
	semimonthly: 24,
	monthly: 12,
	annual: 1,
};

function utcDays(isoDate: string): number {
	return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY);
}

function dayOfYear(isoDate: string): number {
	const year = isoDate.slice(0, 4);
	return utcDays(isoDate) - utcDays(`${year}-01-01`) + 1;
}

/**
 * Periods per year inferred from the period's own length.
 *
 * The payroll calendar records timezone and effective dates, not a frequency
 * enum, so periods-per-year is not a stored fact for a run. Inferring it from
 * the period's inclusive day count is the honest derivation available: a 28–31
 * day period rounds to 12, 14 to 26, 7 to 52, 15 to 24. It is an inference, and
 * a pay group whose periods are irregular in length will infer differently
 * period to period — which is why the ordinal below comes from the actual
 * period sequence rather than from this number.
 */
export function periodsPerYearFromPeriodLength(input: {
	periodEnd: string;
	periodStart: string;
}): number {
	const lengthDays = utcDays(input.periodEnd) - utcDays(input.periodStart) + 1;
	if (!Number.isFinite(lengthDays) || lengthDays < 1) {
		throw new RangeError(
			`Payroll period ${input.periodStart}..${input.periodEnd} has no positive length`,
		);
	}
	// 15-day periods are semimonthly (24), which round-to-nearest would call 24
	// anyway; the clamp only guards degenerate lengths.
	return Math.min(Math.max(Math.round(DAYS_PER_YEAR / lengthDays), 1), 366);
}

/**
 * Cadence for a payroll run's period.
 *
 * The ordinal is the period's position in the pay group's own sequence of
 * periods within the tax year (periods are created in date order, so counting
 * the earlier ones is exact). Periods per year is inferred from length and then
 * widened if the sequence has already exceeded it, so "periods remaining" is
 * never zero or negative for a real run.
 */
export function cadenceFromPeriodSequence(input: {
	periodEnd: string;
	periodStart: string;
	priorPeriodsInTaxYear: number;
}): PayrollStatutoryPeriodCadence {
	const periodOrdinal = input.priorPeriodsInTaxYear + 1;
	const inferred = periodsPerYearFromPeriodLength({
		periodEnd: input.periodEnd,
		periodStart: input.periodStart,
	});
	return {
		periodOrdinal,
		periodsPerYear: Math.max(inferred, periodOrdinal),
	};
}

/**
 * Cadence for a final settlement, which has a declared pay frequency and an
 * effective date but no period row. Each frequency maps its own way because a
 * uniform days/period division is off by one for calendar-aligned cadences: 1
 * March is the start of month 3, but only day 60 of 365.
 */
export function cadenceFromPayFrequency(input: {
	effectiveDate: string;
	payFrequency: HandoffPayFrequency;
}): PayrollStatutoryPeriodCadence {
	const periodsPerYear = PAY_FREQUENCY_PERIODS_PER_YEAR[input.payFrequency];
	const month = Number(input.effectiveDate.slice(5, 7));
	const day = Number(input.effectiveDate.slice(8, 10));
	const ordinal = ((): number => {
		switch (input.payFrequency) {
			case "annual":
				return 1;
			case "monthly":
				return month;
			case "semimonthly":
				return (month - 1) * 2 + (day <= 15 ? 1 : 2);
			case "biweekly":
				return Math.ceil(dayOfYear(input.effectiveDate) / 14);
			case "weekly":
				return Math.ceil(dayOfYear(input.effectiveDate) / 7);
			default: {
				const exhaustive: never = input.payFrequency;
				return exhaustive;
			}
		}
	})();
	return {
		periodOrdinal: Math.min(Math.max(ordinal, 1), periodsPerYear),
		periodsPerYear,
	};
}
