import {
	addScaled,
	formatScaledToDecimal,
	isNegative,
	mulScaled,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../shared/money";
import type { PayrollRoundingPolicy } from "../../shared/rounding-policy";
import { getStatutoryCalculator } from "../../statutory/calculators/registry";
import type {
	PayrollCalcDeductionRuleSnapshot,
	PayrollCalcEarningRuleSnapshot,
	PayrollCalcException,
	PayrollCalcResultLine,
	PayrollCalcStatutoryResult,
	PayrollCalcTraceStep,
	PayrollEmployeeCalcOutput,
	PayrollEmployeeCalcSnapshot,
} from "./types";

const NEGATIVE_AMOUNT_CODE = "NEGATIVE_AMOUNT";
const INELIGIBLE_EMPLOYEE_CODE = "INELIGIBLE_EMPLOYEE";
const CURRENCY_MISMATCH_CODE = "CURRENCY_MISMATCH";
const UNKNOWN_CALCULATOR_CODE = "UNKNOWN_CALCULATOR";
const STATUTORY_CALCULATION_FAILED_CODE = "STATUTORY_CALCULATION_FAILED";

type CalculationContext = {
	snapshot: PayrollEmployeeCalcSnapshot;
	policy: PayrollRoundingPolicy;
	exceptions: PayrollCalcException[];
	trace: PayrollCalcTraceStep[];
	lines: PayrollCalcResultLine[];
	statutoryResults: PayrollCalcStatutoryResult[];
	sequence: number;
	traceCounter: number;
};

function nextSequence(ctx: CalculationContext): number {
	ctx.sequence += 1;
	return ctx.sequence;
}

function nextTraceId(ctx: CalculationContext): string {
	ctx.traceCounter += 1;
	return String(ctx.traceCounter);
}

function addException(
	ctx: CalculationContext,
	input: Omit<PayrollCalcException, "severity"> & {
		severity?: PayrollCalcException["severity"];
	},
): void {
	ctx.exceptions.push({
		severity: input.severity ?? "blocking",
		exceptionCode: input.exceptionCode,
		message: input.message,
		sourceRef: input.sourceRef,
	});
}

function addTrace(
	ctx: CalculationContext,
	input: Omit<PayrollCalcTraceStep, "id" | "amount"> & {
		amount?: bigint | null;
	},
): void {
	ctx.trace.push({
		id: nextTraceId(ctx),
		stage: input.stage,
		message: input.message,
		amount:
			input.amount === undefined || input.amount === null
				? null
				: formatScaledToDecimal(roundScaled(input.amount, ctx.policy)),
	});
}

function formatMoney(ctx: CalculationContext, amount: bigint): string {
	return formatScaledToDecimal(roundScaled(amount, ctx.policy));
}

function assertNonNegativeAmount(
	ctx: CalculationContext,
	amount: bigint,
	sourceRef: string,
	label: string,
): boolean {
	if (isNegative(amount)) {
		addException(ctx, {
			exceptionCode: NEGATIVE_AMOUNT_CODE,
			message: `${label} amount must not be negative`,
			sourceRef,
		});
		return false;
	}
	return true;
}

function assertCurrency(
	ctx: CalculationContext,
	currencyCode: string,
	sourceRef: string,
): boolean {
	if (currencyCode !== ctx.snapshot.currencyCode) {
		addException(ctx, {
			exceptionCode: CURRENCY_MISMATCH_CODE,
			message: `Currency ${currencyCode} does not match snapshot currency ${ctx.snapshot.currencyCode}`,
			sourceRef,
		});
		return false;
	}
	return true;
}

function findEarningRule(
	ctx: CalculationContext,
	ruleId: string,
): PayrollCalcEarningRuleSnapshot | undefined {
	return ctx.snapshot.earningRules.find((rule) => rule.id === ruleId);
}

function findDeductionRule(
	ctx: CalculationContext,
	ruleId: string,
): PayrollCalcDeductionRuleSnapshot | undefined {
	return ctx.snapshot.deductionRules.find((rule) => rule.id === ruleId);
}

function findDeductionRuleByCode(
	ctx: CalculationContext,
	code: string,
): PayrollCalcDeductionRuleSnapshot | undefined {
	return ctx.snapshot.deductionRules.find((rule) => rule.code === code);
}

function computeFixedOrRateAmount(input: {
	ctx: CalculationContext;
	ruleType: "fixed" | "rate";
	lineAmount: string;
	ruleRate: string | null;
	rateBase: bigint;
	sourceRef: string;
	label: string;
}): bigint | null {
	const lineScaled = parseDecimalToScaled(input.lineAmount);
	if (
		!assertNonNegativeAmount(
			input.ctx,
			lineScaled,
			input.sourceRef,
			input.label,
		)
	) {
		return null;
	}

	if (input.ruleType === "fixed") {
		return roundScaled(lineScaled, input.ctx.policy);
	}

	if (input.ruleRate === null) {
		addException(input.ctx, {
			exceptionCode: "MISSING_RULE_RATE",
			message: `${input.label} rate rule is missing a rate`,
			sourceRef: input.sourceRef,
		});
		return null;
	}

	const rateScaled = parseDecimalToScaled(input.ruleRate);
	if (
		!assertNonNegativeAmount(
			input.ctx,
			rateScaled,
			input.sourceRef,
			`${input.label} rate`,
		)
	) {
		return null;
	}

	return roundScaled(mulScaled(input.rateBase, rateScaled), input.ctx.policy);
}

function pushLine(
	ctx: CalculationContext,
	line: Omit<PayrollCalcResultLine, "sequence" | "traceRef" | "amount"> & {
		amount: bigint;
		traceStage: PayrollCalcTraceStep["stage"];
		traceMessage: string;
	},
): void {
	const traceRef = nextTraceId(ctx);
	ctx.lines.push({
		sequence: nextSequence(ctx),
		lineKind: line.lineKind,
		code: line.code,
		ruleCode: line.ruleCode,
		ruleVersion: line.ruleVersion,
		ruleKind: line.ruleKind,
		amount: formatMoney(ctx, line.amount),
		currencyCode: line.currencyCode,
		sourceType: line.sourceType,
		sourceId: line.sourceId,
		traceRef,
	});
	addTrace(ctx, {
		stage: line.traceStage,
		message: line.traceMessage,
		amount: line.amount,
	});
}

function sumLineAmounts(
	lines: PayrollCalcResultLine[],
	kinds: PayrollCalcResultLine["lineKind"][],
): bigint {
	return lines
		.filter((line) => kinds.includes(line.lineKind))
		.reduce(
			(sum, line) => addScaled(sum, parseDecimalToScaled(line.amount)),
			0n,
		);
}

function calculateEarnings(ctx: CalculationContext): bigint {
	const { snapshot } = ctx;
	let grossTotal = 0n;

	const baseAmount = parseDecimalToScaled(snapshot.employee.baseCompensation);
	if (
		assertNonNegativeAmount(
			ctx,
			baseAmount,
			snapshot.employeeId,
			"Base compensation",
		) &&
		assertCurrency(ctx, snapshot.employee.currencyCode, snapshot.employeeId)
	) {
		const roundedBase = roundScaled(baseAmount, ctx.policy);
		pushLine(ctx, {
			lineKind: "earning",
			code: "BASE_COMPENSATION",
			ruleCode: "BASE_COMPENSATION",
			ruleVersion: "snapshot",
			ruleKind: "none",
			amount: roundedBase,
			currencyCode: snapshot.currencyCode,
			sourceType: "employee_snapshot",
			sourceId: snapshot.employeeId,
			traceStage: "earnings",
			traceMessage: "Applied base compensation",
		});
		grossTotal = addScaled(grossTotal, roundedBase);
	}

	for (const allowance of snapshot.employee.recurringAllowances) {
		const amount = parseDecimalToScaled(allowance.amount);
		if (
			!assertNonNegativeAmount(
				ctx,
				amount,
				allowance.code,
				`Allowance ${allowance.code}`,
			)
		) {
			continue;
		}
		const rounded = roundScaled(amount, ctx.policy);
		pushLine(ctx, {
			lineKind: "earning",
			code: allowance.code,
			ruleCode: allowance.code,
			ruleVersion: "hr_snapshot",
			ruleKind: "none",
			amount: rounded,
			currencyCode: snapshot.currencyCode,
			sourceType: "hr_recurring_allowance",
			sourceId: allowance.code,
			traceStage: "earnings",
			traceMessage: `Applied HR allowance ${allowance.code}`,
		});
		grossTotal = addScaled(grossTotal, rounded);
	}

	for (const recurring of snapshot.recurringEarnings) {
		if (!assertCurrency(ctx, recurring.currencyCode, recurring.id)) {
			continue;
		}
		const rule = findEarningRule(ctx, recurring.earningRuleId);
		if (rule === undefined) {
			addException(ctx, {
				exceptionCode: "MISSING_EARNING_RULE",
				message: `Recurring earning ${recurring.id} references missing earning rule`,
				sourceRef: recurring.id,
			});
			continue;
		}

		const amount = computeFixedOrRateAmount({
			ctx,
			ruleType: rule.ruleType,
			lineAmount: recurring.amount,
			ruleRate: rule.rate,
			rateBase: grossTotal,
			sourceRef: recurring.id,
			label: `Recurring earning ${recurring.earningRuleCode}`,
		});
		if (amount === null) {
			continue;
		}

		pushLine(ctx, {
			lineKind: "earning",
			code: recurring.earningRuleCode,
			ruleCode: rule.code,
			ruleVersion: rule.ruleVersion,
			ruleKind: "earning",
			amount,
			currencyCode: snapshot.currencyCode,
			sourceType: "recurring_earning",
			sourceId: recurring.id,
			traceStage: "earnings",
			traceMessage: `Applied recurring earning ${recurring.earningRuleCode}`,
		});
		grossTotal = addScaled(grossTotal, amount);
	}

	for (const variable of snapshot.variableInputs) {
		if (!assertCurrency(ctx, variable.currencyCode, variable.id)) {
			continue;
		}
		const rule = findEarningRule(ctx, variable.earningRuleId);
		if (rule === undefined) {
			addException(ctx, {
				exceptionCode: "MISSING_EARNING_RULE",
				message: `Variable input ${variable.id} references missing earning rule`,
				sourceRef: variable.id,
			});
			continue;
		}

		const amount = computeFixedOrRateAmount({
			ctx,
			ruleType: rule.ruleType,
			lineAmount: variable.amount,
			ruleRate: rule.rate,
			rateBase: grossTotal,
			sourceRef: variable.id,
			label: `Variable input ${variable.earningRuleCode}`,
		});
		if (amount === null) {
			continue;
		}

		pushLine(ctx, {
			lineKind: "earning",
			code: variable.earningRuleCode,
			ruleCode: rule.code,
			ruleVersion: rule.ruleVersion,
			ruleKind: "earning",
			amount,
			currencyCode: snapshot.currencyCode,
			sourceType: variable.sourceType,
			sourceId: variable.sourceId,
			traceStage: "earnings",
			traceMessage: `Applied variable earning ${variable.earningRuleCode}`,
		});
		grossTotal = addScaled(grossTotal, amount);
	}

	addTrace(ctx, {
		stage: "earnings",
		message: "Completed earnings stage",
		amount: grossTotal,
	});
	return grossTotal;
}

function calculateDeductions(input: {
	ctx: CalculationContext;
	gross: bigint;
	taxTiming: "pre_tax" | "post_tax";
}): bigint {
	const { ctx, gross, taxTiming } = input;
	let total = 0n;
	const stage =
		taxTiming === "pre_tax" ? "pre_tax_deductions" : "post_tax_deductions";
	const lineKind =
		taxTiming === "pre_tax" ? "pre_tax_deduction" : "post_tax_deduction";

	for (const deduction of input.ctx.snapshot.employee.recurringDeductions) {
		const matchedRule = findDeductionRuleByCode(ctx, deduction.code);
		const resolvedTaxTiming = matchedRule?.taxTiming ?? "post_tax";
		if (resolvedTaxTiming !== taxTiming) {
			continue;
		}

		const amount = parseDecimalToScaled(deduction.amount);
		if (
			!assertNonNegativeAmount(
				ctx,
				amount,
				deduction.code,
				`HR deduction ${deduction.code}`,
			)
		) {
			continue;
		}

		let computed = roundScaled(amount, ctx.policy);
		if (matchedRule !== undefined && matchedRule.ruleType === "rate") {
			const rateAmount = computeFixedOrRateAmount({
				ctx,
				ruleType: "rate",
				lineAmount: deduction.amount,
				ruleRate: matchedRule.rate,
				rateBase: gross,
				sourceRef: deduction.code,
				label: `HR deduction ${deduction.code}`,
			});
			if (rateAmount === null) {
				continue;
			}
			computed = rateAmount;
		}

		pushLine(ctx, {
			lineKind,
			code: deduction.code,
			ruleCode: matchedRule?.code ?? deduction.code,
			ruleVersion: matchedRule?.ruleVersion ?? "hr_snapshot",
			ruleKind: matchedRule === undefined ? "none" : "deduction",
			amount: computed,
			currencyCode: ctx.snapshot.currencyCode,
			sourceType: "hr_recurring_deduction",
			sourceId: deduction.code,
			traceStage: stage,
			traceMessage: `Applied HR deduction ${deduction.code}`,
		});
		total = addScaled(total, computed);
	}

	for (const recurring of ctx.snapshot.recurringDeductions) {
		if (!assertCurrency(ctx, recurring.currencyCode, recurring.id)) {
			continue;
		}
		const rule = findDeductionRule(ctx, recurring.deductionRuleId);
		if (rule === undefined) {
			addException(ctx, {
				exceptionCode: "MISSING_DEDUCTION_RULE",
				message: `Recurring deduction ${recurring.id} references missing deduction rule`,
				sourceRef: recurring.id,
			});
			continue;
		}
		if (rule.taxTiming !== taxTiming) {
			continue;
		}

		const amount = computeFixedOrRateAmount({
			ctx,
			ruleType: rule.ruleType,
			lineAmount: recurring.amount,
			ruleRate: rule.rate,
			rateBase: gross,
			sourceRef: recurring.id,
			label: `Recurring deduction ${recurring.deductionRuleCode}`,
		});
		if (amount === null) {
			continue;
		}

		pushLine(ctx, {
			lineKind,
			code: recurring.deductionRuleCode,
			ruleCode: rule.code,
			ruleVersion: rule.ruleVersion,
			ruleKind: "deduction",
			amount,
			currencyCode: ctx.snapshot.currencyCode,
			sourceType: "recurring_deduction",
			sourceId: recurring.id,
			traceStage: stage,
			traceMessage: `Applied recurring deduction ${recurring.deductionRuleCode}`,
		});
		total = addScaled(total, amount);
	}

	addTrace(ctx, {
		stage,
		message: `Completed ${taxTiming} deductions`,
		amount: total,
	});
	return total;
}

function calculateStatutory(input: {
	ctx: CalculationContext;
	gross: bigint;
	preTaxDeductions: bigint;
}): { employeeStatutory: bigint; employerStatutory: bigint } {
	const taxableBase = subScaled(input.gross, input.preTaxDeductions);
	let employeeStatutory = 0n;
	let employerStatutory = 0n;

	for (const rule of input.ctx.snapshot.statutoryRules) {
		const calculatorIdValue = rule.configJson.calculatorId;
		if (typeof calculatorIdValue !== "string") {
			addException(input.ctx, {
				exceptionCode: UNKNOWN_CALCULATOR_CODE,
				message: `Statutory rule ${rule.code} is missing calculatorId`,
				sourceRef: rule.code,
			});
			continue;
		}

		try {
			const calculator = getStatutoryCalculator(calculatorIdValue);
			const result = calculator.calculate({
				ruleCode: rule.code,
				ruleVersion: rule.ruleVersion,
				jurisdictionCode: rule.jurisdictionCode,
				configJson: rule.configJson,
				currencyCode: input.ctx.snapshot.currencyCode,
				gross: input.gross,
				taxableBase,
				roundingPolicy: input.ctx.policy,
			});

			if (
				!assertNonNegativeAmount(
					input.ctx,
					result.employeeAmount,
					rule.code,
					`Statutory employee amount ${rule.code}`,
				) ||
				!assertNonNegativeAmount(
					input.ctx,
					result.employerAmount,
					rule.code,
					`Statutory employer amount ${rule.code}`,
				)
			) {
				continue;
			}

			input.ctx.statutoryResults.push({
				ruleCode: rule.code,
				ruleVersion: rule.ruleVersion,
				jurisdictionCode: rule.jurisdictionCode,
				calculatorId: result.calculatorId,
				baseAmount: formatMoney(input.ctx, result.baseAmount),
				employeeAmount: formatMoney(input.ctx, result.employeeAmount),
				employerAmount: formatMoney(input.ctx, result.employerAmount),
				currencyCode: input.ctx.snapshot.currencyCode,
				configSnapshotJson: rule.configJson,
			});

			if (!isNegative(result.employeeAmount) && result.employeeAmount !== 0n) {
				pushLine(input.ctx, {
					lineKind: "employee_statutory",
					code: rule.code,
					ruleCode: rule.code,
					ruleVersion: rule.ruleVersion,
					ruleKind: "statutory",
					amount: result.employeeAmount,
					currencyCode: input.ctx.snapshot.currencyCode,
					sourceType: "statutory_rule",
					sourceId: rule.id,
					traceStage: "statutory",
					traceMessage: result.traceMessage,
				});
				employeeStatutory = addScaled(employeeStatutory, result.employeeAmount);
			}

			if (!isNegative(result.employerAmount) && result.employerAmount !== 0n) {
				pushLine(input.ctx, {
					lineKind: "employer_contribution",
					code: rule.code,
					ruleCode: rule.code,
					ruleVersion: rule.ruleVersion,
					ruleKind: "statutory",
					amount: result.employerAmount,
					currencyCode: input.ctx.snapshot.currencyCode,
					sourceType: "statutory_rule",
					sourceId: rule.id,
					traceStage: "employer_contributions",
					traceMessage: `Employer statutory ${rule.code}`,
				});
				employerStatutory = addScaled(employerStatutory, result.employerAmount);
			}

			addTrace(input.ctx, {
				stage: "statutory",
				message: result.traceMessage,
				amount: result.employeeAmount,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Statutory calculation failed";
			addException(input.ctx, {
				exceptionCode:
					error instanceof RangeError &&
					message.startsWith("Unknown statutory calculator")
						? UNKNOWN_CALCULATOR_CODE
						: STATUTORY_CALCULATION_FAILED_CODE,
				message,
				sourceRef: rule.code,
			});
		}
	}

	return { employeeStatutory, employerStatutory };
}

function buildIneligibleOutput(
	snapshot: PayrollEmployeeCalcSnapshot,
	exceptions: PayrollCalcException[],
	trace: PayrollCalcTraceStep[],
): PayrollEmployeeCalcOutput {
	const zero = formatScaledToDecimal(0n);
	return {
		employeeId: snapshot.employeeId,
		assignmentId: snapshot.assignmentId,
		currencyCode: snapshot.currencyCode,
		calculationVersion: snapshot.calculationVersion,
		roundingPolicy: snapshot.roundingPolicy,
		totals: {
			gross: zero,
			employeeDeductions: zero,
			employeeStatutory: zero,
			employerCost: zero,
			net: zero,
		},
		lines: [],
		statutoryResults: [],
		exceptions,
		trace,
	};
}

export function calculateEmployeePayroll(
	snapshot: PayrollEmployeeCalcSnapshot,
): PayrollEmployeeCalcOutput {
	const ctx: CalculationContext = {
		snapshot,
		policy: snapshot.roundingPolicy,
		exceptions: [],
		trace: [],
		lines: [],
		statutoryResults: [],
		sequence: 0,
		traceCounter: 0,
	};

	addTrace(ctx, {
		stage: "eligibility",
		message: snapshot.eligibility.eligible
			? "Employee eligible for payroll calculation"
			: `Employee ineligible: ${snapshot.eligibility.reason ?? "unknown"}`,
		amount: null,
	});

	if (!snapshot.eligibility.eligible) {
		addException(ctx, {
			exceptionCode: INELIGIBLE_EMPLOYEE_CODE,
			message:
				snapshot.eligibility.reason ?? "Employee is ineligible for payroll",
			sourceRef: snapshot.employeeId,
		});
		return buildIneligibleOutput(snapshot, ctx.exceptions, ctx.trace);
	}

	const gross = calculateEarnings(ctx);
	const preTaxDeductions = calculateDeductions({
		ctx,
		gross,
		taxTiming: "pre_tax",
	});
	calculateStatutory({
		ctx,
		gross,
		preTaxDeductions,
	});
	calculateDeductions({
		ctx,
		gross,
		taxTiming: "post_tax",
	});
	const derivedGross = sumLineAmounts(ctx.lines, ["earning"]);
	const derivedEmployeeDeductions = sumLineAmounts(ctx.lines, [
		"pre_tax_deduction",
		"post_tax_deduction",
	]);
	const derivedEmployeeStatutory = sumLineAmounts(ctx.lines, [
		"employee_statutory",
	]);
	const employerCost = sumLineAmounts(ctx.lines, ["employer_contribution"]);
	const net = subScaled(
		subScaled(derivedGross, derivedEmployeeDeductions),
		derivedEmployeeStatutory,
	);

	addTrace(ctx, {
		stage: "totals",
		message: "Derived payroll totals",
		amount: net,
	});

	return {
		employeeId: snapshot.employeeId,
		assignmentId: snapshot.assignmentId,
		currencyCode: snapshot.currencyCode,
		calculationVersion: snapshot.calculationVersion,
		roundingPolicy: snapshot.roundingPolicy,
		totals: {
			gross: formatMoney(ctx, derivedGross),
			employeeDeductions: formatMoney(ctx, derivedEmployeeDeductions),
			employeeStatutory: formatMoney(ctx, derivedEmployeeStatutory),
			employerCost: formatMoney(ctx, employerCost),
			net: formatMoney(ctx, net),
		},
		lines: ctx.lines,
		statutoryResults: ctx.statutoryResults,
		exceptions: ctx.exceptions,
		trace: ctx.trace,
	};
}

export { sumLineAmounts };
