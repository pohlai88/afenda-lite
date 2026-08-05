import type { z } from "zod";

import {
	formatScaledToDecimal,
	minScaled,
	mulScaledWithRounding,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
import type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
} from "./calculator.types";
import type {
	ceilingRateCalculatorConfigSchema,
	contributionCeilingCalculatorConfigSchema,
	progressiveTaxCalculatorConfigSchema,
	scheduleCalculatorConfigSchema,
} from "./calculator-config";

type ScheduleConfig = z.infer<typeof scheduleCalculatorConfigSchema>;
type CeilingConfig = z.infer<typeof ceilingRateCalculatorConfigSchema>;
type ProgressiveConfig = z.infer<typeof progressiveTaxCalculatorConfigSchema>;
type ContributionConfig = z.infer<
	typeof contributionCeilingCalculatorConfigSchema
>;

function maxScaled(left: bigint, right: bigint): bigint {
	return left >= right ? left : right;
}

function selectBase(
	input: StatutoryCalculatorInput,
	baseKind: "gross" | "taxable",
): bigint {
	const base = baseKind === "gross" ? input.gross : input.taxableBase;
	return roundScaled(base, input.roundingPolicy);
}

export function calculateScheduleContribution(input: {
	calculatorId: string;
	config: ScheduleConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const baseAmount = selectBase(input.input, input.config.baseKind);
	const band = input.config.bands.find((row) => {
		const fromOk = baseAmount >= parseDecimalToScaled(row.wageFromInclusive);
		const toOk =
			row.wageToExclusive === null ||
			baseAmount < parseDecimalToScaled(row.wageToExclusive);
		return fromOk && toOk;
	});
	if (band === undefined) {
		throw new RangeError(
			`${input.calculatorId}: no wage band for base ${formatScaledToDecimal(baseAmount)} on rule ${input.input.ruleCode}`,
		);
	}
	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount: parseDecimalToScaled(band.employeeAmount),
		employerAmount: parseDecimalToScaled(band.employerAmount),
		traceMessage: `${input.calculatorId} schedule band ${band.wageFromInclusive}-${band.wageToExclusive ?? "∞"}`,
	};
}

export function calculateCeilingRateContribution(input: {
	calculatorId: string;
	config: CeilingConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const policy = input.input.roundingPolicy;
	let baseAmount = selectBase(input.input, input.config.baseKind);
	if (
		input.config.wageCeiling !== undefined &&
		input.config.wageCeiling !== null
	) {
		baseAmount = minScaled(
			baseAmount,
			parseDecimalToScaled(input.config.wageCeiling),
		);
	}
	const employeeAmount = mulScaledWithRounding(
		baseAmount,
		parseDecimalToScaled(input.config.employeeRate),
		policy,
	);
	const employerAmount = mulScaledWithRounding(
		baseAmount,
		parseDecimalToScaled(input.config.employerRate),
		policy,
	);
	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount,
		employerAmount,
		traceMessage: `${input.calculatorId} ceiling-rate employee ${input.config.employeeRate} employer ${input.config.employerRate}`,
	};
}

export function calculateContributionWithBaseBounds(input: {
	calculatorId: string;
	config: ContributionConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const policy = input.input.roundingPolicy;
	let baseAmount = selectBase(input.input, input.config.baseKind);
	const zone = input.input.statutoryProfile?.minimumWageZone;
	const zoneFloor =
		zone !== undefined &&
		zone !== null &&
		input.config.zoneMinimumBase !== undefined
			? input.config.zoneMinimumBase[zone]
			: undefined;
	const minimumCandidates = [input.config.minimumBase, zoneFloor].flatMap(
		(value) => (value === undefined || value === null ? [] : [value]),
	);
	for (const minimum of minimumCandidates) {
		baseAmount = maxScaled(baseAmount, parseDecimalToScaled(minimum));
	}
	if (
		input.config.maximumBase !== undefined &&
		input.config.maximumBase !== null
	) {
		baseAmount = minScaled(
			baseAmount,
			parseDecimalToScaled(input.config.maximumBase),
		);
	}
	const employeeAmount = mulScaledWithRounding(
		baseAmount,
		parseDecimalToScaled(input.config.employeeRate),
		policy,
	);
	const employerAmount = mulScaledWithRounding(
		baseAmount,
		parseDecimalToScaled(input.config.employerRate),
		policy,
	);
	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount,
		employerAmount,
		traceMessage: `${input.calculatorId} contribution bounds employee ${input.config.employeeRate} employer ${input.config.employerRate}`,
	};
}

export function calculateProgressiveTax(input: {
	calculatorId: string;
	config: ProgressiveConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const policy = input.input.roundingPolicy;
	const periodBase = selectBase(input.input, input.config.baseKind);
	const residency = input.input.statutoryProfile?.taxResidencyStatus;
	if (
		residency === "non_resident" &&
		input.config.nonResidentRate !== undefined
	) {
		const employeeAmount = mulScaledWithRounding(
			periodBase,
			parseDecimalToScaled(input.config.nonResidentRate),
			policy,
		);
		return {
			calculatorId: input.calculatorId,
			baseAmount: periodBase,
			employeeAmount,
			employerAmount: 0n,
			traceMessage: `${input.calculatorId} non-resident rate ${input.config.nonResidentRate}`,
		};
	}

	const ytdTaxable = parseDecimalToScaled(input.input.yearToDate.taxableBase);
	let cumulative = ytdTaxable + periodBase;
	if (input.config.personalRelief !== undefined) {
		cumulative = subScaled(
			cumulative,
			parseDecimalToScaled(input.config.personalRelief),
		);
	}
	if (
		input.config.dependantRelief !== undefined &&
		input.input.statutoryProfile !== null
	) {
		const dependantRelief =
			parseDecimalToScaled(input.config.dependantRelief) *
			BigInt(input.input.statutoryProfile.dependantCount);
		cumulative = subScaled(cumulative, dependantRelief);
	}
	if (cumulative < 0n) {
		cumulative = 0n;
	}

	const taxOn = (amount: bigint): bigint => {
		let remaining = amount;
		let tax = 0n;
		let cursor = 0n;
		for (const bracket of input.config.brackets) {
			const from = parseDecimalToScaled(bracket.fromInclusive);
			const to =
				bracket.toExclusive === null
					? null
					: parseDecimalToScaled(bracket.toExclusive);
			if (remaining <= 0n || amount <= from) {
				break;
			}
			const spanStart = maxScaled(cursor, from);
			const spanEnd = to === null ? amount : minScaled(amount, to);
			if (spanEnd > spanStart) {
				const slice = spanEnd - spanStart;
				tax += mulScaledWithRounding(
					slice,
					parseDecimalToScaled(bracket.rate),
					policy,
				);
				remaining -= slice;
			}
			cursor = to ?? amount;
		}
		return tax;
	};

	const taxBeforePeriod = taxOn(ytdTaxable > 0n ? ytdTaxable : 0n);
	const taxAfterPeriod = taxOn(cumulative);
	const employeeAmount =
		taxAfterPeriod > taxBeforePeriod ? taxAfterPeriod - taxBeforePeriod : 0n;

	return {
		calculatorId: input.calculatorId,
		baseAmount: periodBase,
		employeeAmount,
		employerAmount: 0n,
		traceMessage: `${input.calculatorId} progressive withholding from YTD`,
	};
}
