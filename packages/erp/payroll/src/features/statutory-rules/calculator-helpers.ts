import {
	divScaled,
	formatScaledToDecimal,
	minScaled,
	mulScaled,
	mulScaledWithRounding,
	PAYROLL_MONEY_SCALE,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";
import type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
} from "./calculator.types";
import type {
	ProgressiveTaxBasis,
	StatutoryBandScheduleConfig,
	StatutoryCeilingRateConfig,
	StatutoryContributionCeilingConfig,
	StatutoryProgressiveTaxConfig,
	StatutoryRoundingMode,
} from "./calculator-config";

const ONE_CURRENCY_UNIT = 10n ** BigInt(PAYROLL_MONEY_SCALE);

export class StatutoryCalculationError extends RangeError {}

function maxScaled(left: bigint, right: bigint): bigint {
	return left >= right ? left : right;
}

function ceilToWholeUnit(value: bigint): bigint {
	if (value <= 0n) {
		return 0n;
	}
	const remainder = value % ONE_CURRENCY_UNIT;
	return remainder === 0n ? value : value + (ONE_CURRENCY_UNIT - remainder);
}

/**
 * Per-rule rounding, config first.
 *
 * A pack that declares `roundingMode` owns the rounding of its own lines and
 * overrides the run-level policy mode for them; `ceil_to_unit` additionally pins
 * whole-unit scale, because "round up to the next ringgit" is not expressible as
 * a mode at the run's payable scale. A pack that declares nothing inherits the
 * run policy untouched.
 */
function effectiveRounding(
	mode: StatutoryRoundingMode | undefined,
	policy: PayrollRoundingPolicy,
): { ceilToUnit: boolean; policy: PayrollRoundingPolicy } {
	if (mode === undefined) {
		return { ceilToUnit: false, policy };
	}
	if (mode === "ceil_to_unit") {
		return { ceilToUnit: true, policy: { scale: 0, mode: "toward_zero" } };
	}
	return { ceilToUnit: false, policy: { scale: policy.scale, mode } };
}

function roundStatutory(
	value: bigint,
	mode: StatutoryRoundingMode | undefined,
	policy: PayrollRoundingPolicy,
): bigint {
	const resolved = effectiveRounding(mode, policy);
	return resolved.ceilToUnit
		? ceilToWholeUnit(value)
		: roundScaled(value, resolved.policy);
}

function multiplyStatutory(
	base: bigint,
	rate: string,
	mode: StatutoryRoundingMode | undefined,
	policy: PayrollRoundingPolicy,
): bigint {
	const resolved = effectiveRounding(mode, policy);
	const rateScaled = parseDecimalToScaled(rate);
	return resolved.ceilToUnit
		? ceilToWholeUnit(mulScaled(base, rateScaled))
		: mulScaledWithRounding(base, rateScaled, resolved.policy);
}

function selectBase(
	input: StatutoryCalculatorInput,
	baseKind: "gross" | "taxable",
	mode: StatutoryRoundingMode | undefined,
): bigint {
	const base = baseKind === "gross" ? input.gross : input.taxableBase;
	return roundStatutory(base, mode, input.roundingPolicy);
}

export function calculateBandScheduleContribution(input: {
	calculatorId: string;
	config: StatutoryBandScheduleConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const { config } = input;
	const baseAmount = selectBase(
		input.input,
		config.baseKind,
		config.roundingMode,
	);
	const band = config.bands.find((row) => {
		const fromOk = baseAmount >= parseDecimalToScaled(row.wageFromInclusive);
		const toOk =
			row.wageToExclusive === null ||
			baseAmount < parseDecimalToScaled(row.wageToExclusive);
		return fromOk && toOk;
	});
	if (band !== undefined) {
		return {
			calculatorId: input.calculatorId,
			baseAmount,
			employeeAmount: parseDecimalToScaled(band.employeeAmount),
			employerAmount: parseDecimalToScaled(band.employerAmount),
			traceMessage: `${input.calculatorId} schedule band ${band.wageFromInclusive}-${band.wageToExclusive ?? "∞"}`,
		};
	}
	if (config.aboveBands === undefined) {
		throw new StatutoryCalculationError(
			`${input.calculatorId}: no wage band for base ${formatScaledToDecimal(baseAmount)} on rule ${input.input.ruleCode}`,
		);
	}
	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount: multiplyStatutory(
			baseAmount,
			config.aboveBands.employeeRate,
			config.roundingMode,
			input.input.roundingPolicy,
		),
		employerAmount: multiplyStatutory(
			baseAmount,
			config.aboveBands.employerRate,
			config.roundingMode,
			input.input.roundingPolicy,
		),
		traceMessage: `${input.calculatorId} above schedule employee ${config.aboveBands.employeeRate} employer ${config.aboveBands.employerRate}`,
	};
}

export function calculateCeilingRateContribution(input: {
	calculatorId: string;
	config: StatutoryCeilingRateConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const { config } = input;
	const policy = input.input.roundingPolicy;
	let baseAmount = selectBase(
		input.input,
		config.baseKind,
		config.roundingMode,
	);
	if (config.wageCeiling !== undefined && config.wageCeiling !== null) {
		baseAmount = minScaled(
			baseAmount,
			parseDecimalToScaled(config.wageCeiling),
		);
	}
	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount: multiplyStatutory(
			baseAmount,
			config.employeeRate,
			config.roundingMode,
			policy,
		),
		employerAmount: multiplyStatutory(
			baseAmount,
			config.employerRate,
			config.roundingMode,
			policy,
		),
		traceMessage: `${input.calculatorId} ceiling-rate employee ${config.employeeRate} employer ${config.employerRate}`,
	};
}

type ZoneAmountMap = NonNullable<
	StatutoryContributionCeilingConfig["zoneMinimumBase"]
>;

/**
 * A zone map that does not price the subject's own zone refuses. Falling back to
 * the national scalar would silently contribute on an unfloored (or uncapped)
 * base for exactly the employees the zone table exists to govern.
 */
function zoneBound(input: {
	bound: "floor" | "ceiling";
	calculatorId: string;
	map: ZoneAmountMap | undefined;
	ruleCode: string;
	zone: keyof ZoneAmountMap | null | undefined;
}): string | undefined {
	if (input.map === undefined) {
		return;
	}
	if (input.zone === undefined || input.zone === null) {
		throw new StatutoryCalculationError(
			`${input.calculatorId}: rule ${input.ruleCode} declares a zone ${input.bound} table but the statutory profile carries no minimum-wage zone`,
		);
	}
	const amount = input.map[input.zone];
	if (amount === undefined) {
		throw new StatutoryCalculationError(
			`${input.calculatorId}: rule ${input.ruleCode} zone ${input.bound} table has no amount for zone ${input.zone}`,
		);
	}
	return amount;
}

export function calculateContributionWithBaseBounds(input: {
	calculatorId: string;
	config: StatutoryContributionCeilingConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const { config } = input;
	const policy = input.input.roundingPolicy;
	let baseAmount = selectBase(
		input.input,
		config.baseKind,
		config.roundingMode,
	);
	const zone = input.input.statutoryProfile?.minimumWageZone;

	const zoneFloor = zoneBound({
		bound: "floor",
		calculatorId: input.calculatorId,
		map: config.zoneMinimumBase,
		ruleCode: input.input.ruleCode,
		zone,
	});
	const zoneCeiling = zoneBound({
		bound: "ceiling",
		calculatorId: input.calculatorId,
		map: config.zoneMaximumBase,
		ruleCode: input.input.ruleCode,
		zone,
	});

	const minimumCandidates = [config.minimumBase, zoneFloor].flatMap((value) =>
		value === undefined || value === null ? [] : [value],
	);
	for (const minimum of minimumCandidates) {
		baseAmount = maxScaled(baseAmount, parseDecimalToScaled(minimum));
	}

	// The zone ceiling is the subject-specific one; when a pack ships both, the
	// zone table wins for that subject rather than intersecting with the scalar.
	const ceiling = zoneCeiling ?? config.maximumBase;
	if (ceiling !== undefined && ceiling !== null) {
		baseAmount = minScaled(baseAmount, parseDecimalToScaled(ceiling));
	}

	return {
		calculatorId: input.calculatorId,
		baseAmount,
		employeeAmount: multiplyStatutory(
			baseAmount,
			config.employeeRate,
			config.roundingMode,
			policy,
		),
		employerAmount: multiplyStatutory(
			baseAmount,
			config.employerRate,
			config.roundingMode,
			policy,
		),
		traceMessage: `${input.calculatorId} contribution bounds employee ${config.employeeRate} employer ${config.employerRate}`,
	};
}

/**
 * Exact bracket tax on one chargeable amount. Brackets are validated contiguous
 * and ascending at parse, so every slice below `amount` is priced exactly once.
 * Slices accumulate at full internal scale and the total rounds once; rounding
 * every slice would let a 12-band table drift by up to twelve rounding units.
 */
function taxOnChargeable(
	amount: bigint,
	brackets: StatutoryProgressiveTaxConfig["brackets"],
): bigint {
	let tax = 0n;
	for (const bracket of brackets) {
		const from = parseDecimalToScaled(bracket.fromInclusive);
		if (amount <= from) {
			break;
		}
		const to =
			bracket.toExclusive === null
				? amount
				: minScaled(amount, parseDecimalToScaled(bracket.toExclusive));
		const slice = subScaled(to, from);
		if (slice > 0n) {
			tax += mulScaled(slice, parseDecimalToScaled(bracket.rate));
		}
	}
	return tax;
}

function reliefTotal(
	config: StatutoryProgressiveTaxConfig,
	input: StatutoryCalculatorInput,
): bigint {
	let relief =
		config.personalRelief === undefined
			? 0n
			: parseDecimalToScaled(config.personalRelief);
	if (config.dependantRelief !== undefined && input.statutoryProfile !== null) {
		relief += multiplyByCount(
			parseDecimalToScaled(config.dependantRelief),
			input.statutoryProfile.dependantCount,
		);
	}
	return relief;
}

function multiplyByCount(amount: bigint, count: number): bigint {
	return amount * BigInt(count);
}

function chargeable(base: bigint, relief: bigint): bigint {
	const value = subScaled(base, relief);
	return value < 0n ? 0n : value;
}

/**
 * Withholding occasions left in the tax year, this one included.
 *
 * A final settlement has exactly one: it is the last moment this employer can
 * withhold anything, and there is no future period whose pay could be projected
 * or over which an outstanding liability could be spread. A running period must
 * know its cadence and refuses without it.
 */
function remainingPeriods(
	input: StatutoryCalculatorInput,
	calculatorId: string,
): number {
	if (input.finalPeriod) {
		return 1;
	}
	const { periodOrdinal, periodsPerYear } = input;
	if (periodOrdinal === null || periodsPerYear === null) {
		throw new StatutoryCalculationError(
			`${calculatorId}: rule ${input.ruleCode} withholds on an annualized basis but the caller supplied no period cadence`,
		);
	}
	if (
		periodOrdinal < 1 ||
		periodsPerYear < 1 ||
		periodOrdinal > periodsPerYear
	) {
		throw new StatutoryCalculationError(
			`${calculatorId}: rule ${input.ruleCode} received an impossible period cadence (${periodOrdinal} of ${periodsPerYear})`,
		);
	}
	return periodsPerYear - periodOrdinal + 1;
}

function nonResidentOutput(input: {
	calculatorId: string;
	config: StatutoryProgressiveTaxConfig;
	input: StatutoryCalculatorInput;
	periodBase: bigint;
}): StatutoryCalculatorOutput {
	const { config } = input;
	if (config.nonResidentRate === undefined) {
		throw new StatutoryCalculationError(
			`${input.calculatorId}: rule ${input.input.ruleCode} has a non-resident subject but declares no nonResidentRate`,
		);
	}
	return {
		calculatorId: input.calculatorId,
		baseAmount: input.periodBase,
		employeeAmount: multiplyStatutory(
			input.periodBase,
			config.nonResidentRate,
			config.roundingMode,
			input.input.roundingPolicy,
		),
		employerAmount: 0n,
		traceMessage: `${input.calculatorId} non-resident rate ${config.nonResidentRate}`,
	};
}

function periodBasisTax(input: {
	config: StatutoryProgressiveTaxConfig;
	input: StatutoryCalculatorInput;
	periodBase: bigint;
}): { amount: bigint; trace: string } {
	const chargeableAmount = chargeable(
		input.periodBase,
		reliefTotal(input.config, input.input),
	);
	return {
		amount: taxOnChargeable(chargeableAmount, input.config.brackets),
		trace: `period basis on chargeable ${formatScaledToDecimal(chargeableAmount)}`,
	};
}

/**
 * Cumulative differential withholding.
 *
 * Both sides of the difference carry the SAME relief-adjusted base. Subtracting
 * tax on an unrelieved year-to-date from tax on a relieved cumulative total
 * charges the relief's own tax value back to the employee in the first period it
 * applies, and over-withholds in every period after it.
 */
function cumulativeBasisTax(input: {
	config: StatutoryProgressiveTaxConfig;
	input: StatutoryCalculatorInput;
	periodBase: bigint;
}): { amount: bigint; trace: string } {
	const relief = reliefTotal(input.config, input.input);
	const priorBase = parseDecimalToScaled(input.input.yearToDate.taxableBase);
	const priorChargeable = chargeable(priorBase, relief);
	const cumulativeChargeable = chargeable(priorBase + input.periodBase, relief);
	const priorTax = taxOnChargeable(priorChargeable, input.config.brackets);
	const cumulativeTax = taxOnChargeable(
		cumulativeChargeable,
		input.config.brackets,
	);
	const amount = cumulativeTax > priorTax ? cumulativeTax - priorTax : 0n;
	return {
		amount,
		trace: `cumulative basis chargeable ${formatScaledToDecimal(priorChargeable)} → ${formatScaledToDecimal(cumulativeChargeable)}`,
	};
}

/**
 * Annualized withholding (Malaysian PCB shape).
 *
 * remaining        = periodsPerYear - periodOrdinal + 1   (this period included)
 *                    or 1 on a final settlement
 * projectedAnnual  = taxableYearToDate + remaining × currentTaxable
 * annualChargeable = max(0, projectedAnnual - annualReliefs)
 * annualTax        = brackets(annualChargeable)
 * periodTax        = max(0, annualTax - taxWithheldYearToDate) / remaining
 *
 * On a final settlement `remaining` collapses to 1, so the projection becomes
 * year-to-date plus what is actually being paid — no invented future income —
 * and the whole outstanding liability is collected at the last moment this
 * employer can withhold it.
 *
 * Reliefs are NOT pro-rated, on either path. `personalRelief` and
 * `dependantRelief` are annual figures on this basis, and the running path
 * already subtracts them whole from a full-year projection at every ordinal; the
 * settlement subtracts the same whole annual relief from the year's actual
 * income. Pro-rating at settlement only would make the same employee's relief
 * depend on whether their last period was a run or a termination.
 *
 * The netting uses the DISTINCT tax-withheld channel, never the commingled
 * employee statutory total: netting contributions off a tax liability would
 * collapse withholding to zero for most of the year.
 */
function annualizedBasisTax(input: {
	calculatorId: string;
	config: StatutoryProgressiveTaxConfig;
	input: StatutoryCalculatorInput;
	periodBase: bigint;
}): { amount: bigint; trace: string } {
	const remaining = remainingPeriods(input.input, input.calculatorId);
	const remainingScaled = parseDecimalToScaled(String(remaining));

	const projectedAnnual =
		parseDecimalToScaled(input.input.yearToDate.taxableBase) +
		multiplyByCount(input.periodBase, remaining);
	const annualChargeable = chargeable(
		projectedAnnual,
		reliefTotal(input.config, input.input),
	);
	const annualTax = taxOnChargeable(annualChargeable, input.config.brackets);
	const withheld = parseDecimalToScaled(input.input.yearToDate.taxWithheld);
	const outstanding = annualTax > withheld ? annualTax - withheld : 0n;
	return {
		amount: divScaled(outstanding, remainingScaled),
		trace: `annualized chargeable ${formatScaledToDecimal(annualChargeable)} annual tax ${formatScaledToDecimal(annualTax)} less withheld ${formatScaledToDecimal(withheld)} over ${remaining} periods`,
	};
}

const PROGRESSIVE_BASIS_HANDLERS: Record<
	ProgressiveTaxBasis,
	(input: {
		calculatorId: string;
		config: StatutoryProgressiveTaxConfig;
		input: StatutoryCalculatorInput;
		periodBase: bigint;
	}) => { amount: bigint; trace: string }
> = {
	period: periodBasisTax,
	cumulative: cumulativeBasisTax,
	cumulative_annualized: annualizedBasisTax,
};

export function calculateProgressiveTax(input: {
	calculatorId: string;
	config: StatutoryProgressiveTaxConfig;
	input: StatutoryCalculatorInput;
}): StatutoryCalculatorOutput {
	const { config } = input;
	const periodBase = selectBase(
		input.input,
		config.baseKind,
		config.roundingMode,
	);

	if (input.input.statutoryProfile?.taxResidencyStatus === "non_resident") {
		return nonResidentOutput({
			calculatorId: input.calculatorId,
			config,
			input: input.input,
			periodBase,
		});
	}

	const computed = PROGRESSIVE_BASIS_HANDLERS[config.basis]({
		calculatorId: input.calculatorId,
		config,
		input: input.input,
		periodBase,
	});
	const employeeAmount = roundStatutory(
		computed.amount < 0n ? 0n : computed.amount,
		config.roundingMode,
		input.input.roundingPolicy,
	);

	return {
		calculatorId: input.calculatorId,
		baseAmount: periodBase,
		employeeAmount: employeeAmount < 0n ? 0n : employeeAmount,
		employerAmount: 0n,
		traceMessage: `${input.calculatorId} ${computed.trace}`,
	};
}
