import { z } from "zod";

import { parseDecimalToScaled } from "../../kernel/money/money";

/**
 * Pack config vocabulary.
 *
 * Every schema here is keyed by `calculatorId` as a literal. The pipeline
 * dispatcher reads `configJson.calculatorId` and then hands the WHOLE config
 * object to the calculator, so a `.strict()` pack schema that does not declare
 * `calculatorId` rejects every real config as an unrecognized key. Declaring the
 * literal both admits the dispatcher's own routing key and pins each config to
 * exactly one pack (a SOCSO config can never be parsed by the EIS pack).
 */

const nonNegativeMoneySchema = z
	.string()
	.regex(/^\d+(\.\d+)?$/, "must be a non-negative decimal amount");
const nonNegativeRateSchema = z
	.string()
	.regex(/^\d+(\.\d+)?$/, "must be a non-negative decimal rate");

const baseKindSchema = z.enum(["gross", "taxable"]);

/**
 * Rounding vocabulary a rule pack may pin for its own lines.
 *
 * Precedence: when a pack config carries `roundingMode`, that mode governs the
 * rounding of THAT rule's employee/employer amounts and overrides the run-level
 * `PayrollRoundingPolicy.mode`. The run policy still owns the output scale, with
 * one exception: `ceil_to_unit` is whole-currency-unit ceiling by definition
 * (KWSP rounds contributions up to the next ringgit), so it pins scale 0 for the
 * rule that declares it. A pack with no `roundingMode` inherits the run policy
 * unchanged.
 */
export const statutoryRoundingModeSchema = z.enum([
	"half_even",
	"half_up",
	"toward_zero",
	"ceil_to_unit",
]);

export type StatutoryRoundingMode = z.infer<typeof statutoryRoundingModeSchema>;

/** Wage-band schedule row — amounts are pack-supplied, never hard-coded in calculator code. */
export const wageBandRowSchema = z
	.object({
		wageFromInclusive: nonNegativeMoneySchema,
		wageToExclusive: nonNegativeMoneySchema.nullable(),
		employeeAmount: nonNegativeMoneySchema,
		employerAmount: nonNegativeMoneySchema,
	})
	.strict();

export const progressiveBracketSchema = z
	.object({
		fromInclusive: nonNegativeMoneySchema,
		toExclusive: nonNegativeMoneySchema.nullable(),
		rate: nonNegativeRateSchema,
	})
	.strict();

const zoneAmountMapSchema = z
	.object({
		I: nonNegativeMoneySchema.optional(),
		II: nonNegativeMoneySchema.optional(),
		III: nonNegativeMoneySchema.optional(),
		IV: nonNegativeMoneySchema.optional(),
	})
	.strict();

interface OrderedRow {
	from: string;
	to: string | null;
}

/**
 * One ordering/overlap check for every laddered table (wage bands and tax
 * brackets alike). A table that is out of order, overlapping, or gapped prices
 * some wage twice or not at all; both are found here at parse time rather than
 * as a runtime "no wage band" throw on somebody's payday.
 */
function addLadderIssues(
	rows: readonly OrderedRow[],
	label: string,
	ctx: z.RefinementCtx,
): void {
	const [first] = rows;
	if (first !== undefined && parseDecimalToScaled(first.from) !== 0n) {
		ctx.addIssue({
			code: "custom",
			message: `${label} must start at 0 so no wage is unpriced (got ${first.from})`,
			path: [0, "from"],
		});
	}
	for (const [index, row] of rows.entries()) {
		const from = parseDecimalToScaled(row.from);
		const to = row.to === null ? null : parseDecimalToScaled(row.to);
		if (to !== null && to <= from) {
			ctx.addIssue({
				code: "custom",
				message: `${label} row ${index} ends at or before it starts (${row.from} → ${row.to})`,
				path: [index],
			});
		}
		const next = rows[index + 1];
		if (next === undefined) {
			continue;
		}
		if (to === null) {
			ctx.addIssue({
				code: "custom",
				message: `${label} row ${index} is open-ended but is not the last row`,
				path: [index],
			});
			continue;
		}
		const nextFrom = parseDecimalToScaled(next.from);
		if (nextFrom < to) {
			ctx.addIssue({
				code: "custom",
				message: `${label} rows ${index} and ${index + 1} overlap (${row.to} > ${next.from})`,
				path: [index + 1],
			});
		} else if (nextFrom > to) {
			ctx.addIssue({
				code: "custom",
				message: `${label} rows ${index} and ${index + 1} leave a gap (${row.to} → ${next.from})`,
				path: [index + 1],
			});
		}
	}
}

/**
 * KWSP Third Schedule is ~1000 rows for the citizen category alone; the previous
 * 512-row cap could not hold one real table. 2048 leaves headroom for a
 * multi-category schedule without admitting an unbounded config blob.
 */
const MAX_WAGE_BAND_ROWS = 2048;

const bandScheduleShape = {
	baseKind: baseKindSchema,
	bands: z.array(wageBandRowSchema).min(1).max(MAX_WAGE_BAND_ROWS),
	/**
	 * Rates applied above the last closed band. KWSP prices wages above the
	 * schedule by percentage rather than by a table row, and PERKESO caps.
	 */
	aboveBands: z
		.object({
			employeeRate: nonNegativeRateSchema,
			employerRate: nonNegativeRateSchema,
		})
		.strict()
		.optional(),
	roundingMode: statutoryRoundingModeSchema.optional(),
} as const;

const bandScheduleBaseSchema = z.object(bandScheduleShape).strict();

export type StatutoryBandScheduleConfig = z.infer<
	typeof bandScheduleBaseSchema
> & { calculatorId: string };

function refineBandSchedule(
	value: z.infer<typeof bandScheduleBaseSchema>,
	ctx: z.RefinementCtx,
): void {
	addLadderIssues(
		value.bands.map((row) => ({
			from: row.wageFromInclusive,
			to: row.wageToExclusive,
		})),
		"bands",
		ctx,
	);
	const last = value.bands.at(-1);
	if (last === undefined) {
		return;
	}
	if (last.wageToExclusive === null && value.aboveBands !== undefined) {
		ctx.addIssue({
			code: "custom",
			message:
				"aboveBands is unreachable because the last band is open-ended; remove one of them",
			path: ["aboveBands"],
		});
	}
	if (last.wageToExclusive !== null && value.aboveBands === undefined) {
		ctx.addIssue({
			code: "custom",
			message: `bands stop at ${last.wageToExclusive} with no aboveBands, so wages above the table are unpriced`,
			path: ["aboveBands"],
		});
	}
}

/** Fixed-amount wage-band schedule (KWSP Third Schedule / PERKESO tables). */
export function fixedAmountBandCalculatorConfigSchema<Id extends string>(
	calculatorId: Id,
) {
	return z
		.object({ ...bandScheduleShape, calculatorId: z.literal(calculatorId) })
		.strict()
		.superRefine(refineBandSchedule);
}

const ceilingRateShape = {
	baseKind: baseKindSchema,
	employeeRate: nonNegativeRateSchema,
	employerRate: nonNegativeRateSchema,
	wageCeiling: nonNegativeMoneySchema.nullable().optional(),
	roundingMode: statutoryRoundingModeSchema.optional(),
} as const;

const ceilingRateBaseSchema = z.object(ceilingRateShape).strict();

export type StatutoryCeilingRateConfig = z.infer<
	typeof ceilingRateBaseSchema
> & { calculatorId: string };

export function ceilingRateCalculatorConfigSchema<Id extends string>(
	calculatorId: Id,
) {
	return z
		.object({ ...ceilingRateShape, calculatorId: z.literal(calculatorId) })
		.strict();
}

/**
 * SOCSO and EIS are published by PERKESO as fixed-amount contribution tables,
 * not as a rate on a capped wage. Both shapes stay selectable per pack: a config
 * carrying `bands` is read as the table variant, one carrying `employeeRate` as
 * the ceiling-rate variant, so a reviewer can populate the real PERKESO table
 * without a pack rewrite.
 */
export function bandedContributionCalculatorConfigSchema<Id extends string>(
	calculatorId: Id,
) {
	return z.union([
		fixedAmountBandCalculatorConfigSchema(calculatorId),
		ceilingRateCalculatorConfigSchema(calculatorId),
	]);
}

/**
 * How a progressive tax pack turns a period's base into a withholding.
 *
 * - `period`: brackets and reliefs are PERIOD amounts, applied to this period's
 *   base alone. Vietnam PIT withholds this way (monthly reliefs, monthly bands).
 * - `cumulative`: brackets and reliefs are CUMULATIVE-to-date amounts; the
 *   period's tax is the difference between tax on year-to-date-plus-current and
 *   tax on year-to-date, with the same reliefs applied to both sides.
 * - `cumulative_annualized`: brackets and reliefs are ANNUAL amounts; the period
 *   projects an annual chargeable income, computes annual tax, subtracts tax
 *   already withheld this year, and spreads the remainder over the periods left
 *   in the year. Malaysian PCB withholds this way.
 */
export const progressiveTaxBasisSchema = z.enum([
	"period",
	"cumulative",
	"cumulative_annualized",
]);

export type ProgressiveTaxBasis = z.infer<typeof progressiveTaxBasisSchema>;

const progressiveTaxShape = {
	baseKind: baseKindSchema,
	basis: progressiveTaxBasisSchema,
	brackets: z.array(progressiveBracketSchema).min(1).max(64),
	/** Flat personal relief, on the same time basis as `basis`. */
	personalRelief: nonNegativeMoneySchema.optional(),
	/** Relief per dependant when statutoryProfile.dependantCount is present. */
	dependantRelief: nonNegativeMoneySchema.optional(),
	nonResidentRate: nonNegativeRateSchema.optional(),
	roundingMode: statutoryRoundingModeSchema.optional(),
} as const;

const progressiveTaxBaseSchema = z.object(progressiveTaxShape).strict();

export type StatutoryProgressiveTaxConfig = z.infer<
	typeof progressiveTaxBaseSchema
> & { calculatorId: string };

export function progressiveTaxCalculatorConfigSchema<Id extends string>(
	calculatorId: Id,
) {
	return z
		.object({ ...progressiveTaxShape, calculatorId: z.literal(calculatorId) })
		.strict()
		.superRefine((value, ctx) => {
			addLadderIssues(
				value.brackets.map((row) => ({
					from: row.fromInclusive,
					to: row.toExclusive,
				})),
				"brackets",
				ctx,
			);
		});
}

const contributionCeilingShape = {
	baseKind: baseKindSchema,
	employeeRate: nonNegativeRateSchema,
	employerRate: nonNegativeRateSchema,
	minimumBase: nonNegativeMoneySchema.nullable().optional(),
	maximumBase: nonNegativeMoneySchema.nullable().optional(),
	/** Regional zone floors keyed by VN minimum-wage zone I–IV. */
	zoneMinimumBase: zoneAmountMapSchema.optional(),
	/**
	 * Regional zone ceilings keyed by VN minimum-wage zone I–IV. Unemployment
	 * insurance caps at 20× the REGIONAL minimum wage, so its ceiling is
	 * zone-dependent while SI/HI cap at a national multiple of base salary.
	 * When present it wins over the scalar `maximumBase` for the subject's zone.
	 */
	zoneMaximumBase: zoneAmountMapSchema.optional(),
	roundingMode: statutoryRoundingModeSchema.optional(),
} as const;

const contributionCeilingBaseSchema = z
	.object(contributionCeilingShape)
	.strict();

export type StatutoryContributionCeilingConfig = z.infer<
	typeof contributionCeilingBaseSchema
> & { calculatorId: string };

export function contributionCeilingCalculatorConfigSchema<Id extends string>(
	calculatorId: Id,
) {
	return z
		.object({
			...contributionCeilingShape,
			calculatorId: z.literal(calculatorId),
		})
		.strict();
}
