import { z } from "zod";

const moneySchema = z.string().regex(/^-?\d+(\.\d+)?$/);
const rateSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

/** Wage-band schedule row — amounts are pack-supplied, never hard-coded in calculator code. */
export const wageBandRowSchema = z
	.object({
		wageFromInclusive: moneySchema,
		wageToExclusive: moneySchema.nullable(),
		employeeAmount: moneySchema,
		employerAmount: moneySchema,
	})
	.strict();

export const scheduleCalculatorConfigSchema = z
	.object({
		baseKind: z.enum(["gross", "taxable"]),
		bands: z.array(wageBandRowSchema).min(1).max(512),
	})
	.strict();

export const ceilingRateCalculatorConfigSchema = z
	.object({
		baseKind: z.enum(["gross", "taxable"]),
		employeeRate: rateSchema,
		employerRate: rateSchema,
		wageCeiling: moneySchema.nullable().optional(),
	})
	.strict();

export const progressiveBracketSchema = z
	.object({
		fromInclusive: moneySchema,
		toExclusive: moneySchema.nullable(),
		rate: rateSchema,
	})
	.strict();

export const progressiveTaxCalculatorConfigSchema = z
	.object({
		baseKind: z.enum(["gross", "taxable"]),
		brackets: z.array(progressiveBracketSchema).min(1).max(64),
		/** Flat personal relief subtracted from taxable base before brackets. */
		personalRelief: moneySchema.optional(),
		/** Relief per dependant when statutoryProfile.dependantCount is present. */
		dependantRelief: moneySchema.optional(),
		nonResidentRate: rateSchema.optional(),
	})
	.strict();

export const contributionCeilingCalculatorConfigSchema = z
	.object({
		baseKind: z.enum(["gross", "taxable"]),
		employeeRate: rateSchema,
		employerRate: rateSchema,
		minimumBase: moneySchema.nullable().optional(),
		maximumBase: moneySchema.nullable().optional(),
		/** Optional regional zone floors keyed by VN minimum-wage zone I–IV. */
		zoneMinimumBase: z
			.object({
				I: moneySchema.optional(),
				II: moneySchema.optional(),
				III: moneySchema.optional(),
				IV: moneySchema.optional(),
			})
			.strict()
			.optional(),
	})
	.strict();
