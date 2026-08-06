import {
	addScaled,
	formatScaledToDecimal,
	isNegative,
	mulScaledWithRounding,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";
import { StatutoryCalculationError } from "../statutory-rules/calculator-helpers";
import { getStatutoryCalculator } from "../statutory-rules/calculator-registry";
import type {
	PayrollCalcDeductionRuleSnapshot,
	PayrollCalcEarningRuleSnapshot,
	PayrollCalcException,
	PayrollCalcResultLine,
	PayrollCalcStatutoryResult,
	PayrollCalcTraceStep,
	PayrollEmployeeCalcOutput,
	PayrollEmployeeCalcSnapshot,
} from "./calculation.types";

const NEGATIVE_AMOUNT_CODE = "NEGATIVE_AMOUNT";
const INELIGIBLE_EMPLOYEE_CODE = "INELIGIBLE_EMPLOYEE";
const CURRENCY_MISMATCH_CODE = "CURRENCY_MISMATCH";
const UNKNOWN_CALCULATOR_CODE = "UNKNOWN_CALCULATOR";
const MISSING_YEAR_TO_DATE_CODE = "MISSING_YEAR_TO_DATE";
const STATUTORY_CALCULATION_FAILED_CODE = "STATUTORY_CALCULATION_FAILED";
const MISSING_STATUTORY_RULES_CODE = "MISSING_STATUTORY_RULES";
const LAPSED_STATUTORY_RULE_CODE = "LAPSED_STATUTORY_RULE";

interface CalculationContext {
	exceptions: PayrollCalcException[];
	lines: PayrollCalcResultLine[];
	policy: PayrollRoundingPolicy;
	sequence: number;
	snapshot: PayrollEmployeeCalcSnapshot;
	statutoryResults: PayrollCalcStatutoryResult[];
	trace: PayrollCalcTraceStep[];
	traceCounter: number;
}

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

function assertPinnedRule(input: {
	ctx: CalculationContext;
	sourceRef: string;
	expectedCode: string;
	expectedVersion: string;
	rule: {
		code: string;
		ruleVersion: string;
		currencyCode: string;
	};
}): boolean {
	if (
		input.rule.code !== input.expectedCode ||
		input.rule.ruleVersion !== input.expectedVersion
	) {
		addException(input.ctx, {
			exceptionCode: "RULE_VERSION_MISMATCH",
			message: `Pinned rule ${input.expectedCode}@${input.expectedVersion} does not match selected snapshot`,
			sourceRef: input.sourceRef,
		});
		return false;
	}
	if (input.rule.currencyCode !== input.ctx.snapshot.currencyCode) {
		addException(input.ctx, {
			exceptionCode: CURRENCY_MISMATCH_CODE,
			message: `Rule currency ${input.rule.currencyCode} does not match snapshot currency ${input.ctx.snapshot.currencyCode}`,
			sourceRef: input.sourceRef,
		});
		return false;
	}
	return true;
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

	return mulScaledWithRounding(input.rateBase, rateScaled, input.ctx.policy);
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Earnings keeps fixed/rate, recurring, variable, currency, and pinned-version evidence in one auditable stage.
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
		if (
			!assertPinnedRule({
				ctx,
				sourceRef: recurring.id,
				expectedCode: recurring.earningRuleCode,
				expectedVersion: recurring.earningRuleVersion,
				rule,
			})
		) {
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
		if (
			!assertPinnedRule({
				ctx,
				sourceRef: variable.id,
				expectedCode: variable.earningRuleCode,
				expectedVersion: variable.earningRuleVersion,
				rule,
			})
		) {
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The deduction matrix keeps explicit tax timing and exception evidence branches auditable.
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
		if (matchedRule === undefined) {
			if (taxTiming === "post_tax") {
				addException(ctx, {
					exceptionCode: "MISSING_HR_DEDUCTION_RULE",
					message: `Approved HR deduction ${deduction.code} requires a finalized payroll rule`,
					sourceRef: deduction.code,
				});
			}
			continue;
		}
		const resolvedTaxTiming = matchedRule.taxTiming;
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
		if (matchedRule.ruleType === "rate") {
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
			ruleCode: matchedRule.code,
			ruleVersion: matchedRule.ruleVersion,
			ruleKind: "deduction",
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
		if (
			!assertPinnedRule({
				ctx,
				sourceRef: recurring.id,
				expectedCode: recurring.deductionRuleCode,
				expectedVersion: recurring.deductionRuleVersion,
				rule,
			})
		) {
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

function applyApprovedEmployerBenefitContributions(
	ctx: CalculationContext,
	gross: bigint,
): void {
	for (const component of ctx.snapshot.approvedWorkFacts.components) {
		if (component.kind !== "benefit_employer_contribution") {
			continue;
		}
		const rule = findDeductionRuleByCode(ctx, component.code);
		if (rule === undefined) {
			addException(ctx, {
				exceptionCode: "MISSING_EMPLOYER_BENEFIT_RULE",
				message: `Approved employer contribution ${component.code} requires a finalized payroll rule`,
				sourceRef: component.sourceId,
			});
			continue;
		}
		if (!assertCurrency(ctx, component.currencyCode, component.sourceId)) {
			continue;
		}
		const amount = computeFixedOrRateAmount({
			ctx,
			ruleType: rule.ruleType,
			lineAmount: component.amount,
			ruleRate: rule.rate,
			rateBase: gross,
			sourceRef: component.sourceId,
			label: `Employer contribution ${component.code}`,
		});
		if (amount === null) {
			continue;
		}
		pushLine(ctx, {
			lineKind: "employer_contribution",
			code: component.code,
			ruleCode: rule.code,
			ruleVersion: rule.ruleVersion,
			ruleKind: "deduction",
			amount,
			currencyCode: ctx.snapshot.currencyCode,
			sourceType: component.sourceType,
			sourceId: component.sourceId,
			traceStage: "employer_contributions",
			traceMessage: `Applied employer contribution ${component.code}`,
		});
	}
}

function statutoryFailureMessage(
	error: unknown,
	isUnknownCalculator: boolean,
): string {
	if (isUnknownCalculator && error instanceof Error) {
		return error.message;
	}
	if (error instanceof StatutoryCalculationError) {
		return `Statutory calculation failed: ${error.message}`;
	}
	return "Statutory calculation failed";
}

interface PendingEmployerContribution {
	amount: bigint;
	code: string;
	ruleId: string;
	ruleVersion: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The statutory matrix keeps calculator, rounding, and exception evidence branches auditable.
function calculateStatutory(input: {
	ctx: CalculationContext;
	gross: bigint;
	preTaxDeductions: bigint;
}): {
	employeeStatutory: bigint;
	employerContributions: PendingEmployerContribution[];
} {
	const taxableBase = subScaled(input.gross, input.preTaxDeductions);
	let employeeStatutory = 0n;
	const employerContributions: PendingEmployerContribution[] = [];
	const { yearToDate } = input.ctx.snapshot;

	// Fail closed on a lapsed statutory configuration (A2 I7). The subject's own
	// statutory profile names the jurisdiction they are liable in; if no active
	// rule for that jurisdiction resolved for this period, the run would pay a
	// Malaysian or Vietnamese employee with zero EPF/SOCSO/PCB and look correct.
	// A period whose rules simply expired is indistinguishable from one that
	// never had any, so the profile — not the empty list — is the signal.
	const declaredJurisdiction =
		input.ctx.snapshot.statutoryProfile?.jurisdictionCode;
	if (declaredJurisdiction !== undefined && declaredJurisdiction !== null) {
		if (
			!input.ctx.snapshot.statutoryRules.some(
				(rule) => rule.jurisdictionCode === declaredJurisdiction,
			)
		) {
			addException(input.ctx, {
				exceptionCode: MISSING_STATUTORY_RULES_CODE,
				message: `No active statutory rule resolved for jurisdiction ${declaredJurisdiction} in this period`,
				sourceRef: input.ctx.snapshot.employeeId,
			});
			return { employeeStatutory, employerContributions };
		}

		// PARTIAL lapse. A whole-jurisdiction outage is the loud case; the
		// dangerous one is EPF still active while PCB quietly expired, which the
		// check above waves through because SOME rule for the jurisdiction
		// resolved. Withholding zero tax for a liable subject is not a smaller
		// error than withholding nothing at all.
		const lapsed = (input.ctx.snapshot.lapsedStatutoryRules ?? []).filter(
			(rule) => rule.jurisdictionCode === declaredJurisdiction,
		);
		if (lapsed.length > 0) {
			for (const rule of lapsed) {
				addException(input.ctx, {
					exceptionCode: LAPSED_STATUTORY_RULE_CODE,
					message: `Statutory rule ${rule.ruleCode} (${rule.calculatorId}) was active in the previous period but has no active rule covering this one`,
					sourceRef: input.ctx.snapshot.employeeId,
				});
			}
			return { employeeStatutory, employerContributions };
		}
	}

	if (input.ctx.snapshot.statutoryRules.length === 0) {
		return { employeeStatutory, employerContributions };
	}
	if (yearToDate === undefined) {
		// Fail closed on the pipeline's own channel (C6): a blocking exception
		// refuses the run and the retro recompute. The previous zero-fill — with
		// a `taxYear: 0` sentinel — told every calculator the employee had earned
		// nothing this year, which under-withholds on banded rules.
		addException(input.ctx, {
			exceptionCode: MISSING_YEAR_TO_DATE_CODE,
			message:
				"Payroll year-to-date facts are not composed for this calculation",
			sourceRef: input.ctx.snapshot.employeeId,
		});
		return { employeeStatutory, employerContributions };
	}

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
				// A payroll run is never the last withholding occasion of the year;
				// only a final settlement is.
				finalPeriod: false,
				gross: input.gross,
				periodOrdinal: input.ctx.snapshot.periodCadence?.periodOrdinal ?? null,
				periodsPerYear:
					input.ctx.snapshot.periodCadence?.periodsPerYear ?? null,
				roundingPolicy: input.ctx.policy,
				statutoryProfile: input.ctx.snapshot.statutoryProfile ?? null,
				taxableBase,
				yearToDate,
			});

			if (
				!(
					assertNonNegativeAmount(
						input.ctx,
						result.employeeAmount,
						rule.code,
						`Statutory employee amount ${rule.code}`,
					) &&
					assertNonNegativeAmount(
						input.ctx,
						result.employerAmount,
						rule.code,
						`Statutory employer amount ${rule.code}`,
					)
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
				employerContributions.push({
					amount: result.employerAmount,
					code: rule.code,
					ruleId: rule.id,
					ruleVersion: rule.ruleVersion,
				});
			}

			addTrace(input.ctx, {
				stage: "statutory",
				message: result.traceMessage,
				amount: result.employeeAmount,
			});
		} catch (error) {
			const isUnknownCalculator =
				error instanceof RangeError &&
				error.message.startsWith("Unknown statutory calculator");
			// A pack's own refusal already names the offending config path and
			// zod issue; swallowing it left a reviewer with "failed" and nothing
			// to fix. Only genuinely foreign throws stay generic.
			const message = statutoryFailureMessage(error, isUnknownCalculator);
			addException(input.ctx, {
				exceptionCode: isUnknownCalculator
					? UNKNOWN_CALCULATOR_CODE
					: STATUTORY_CALCULATION_FAILED_CODE,
				message,
				sourceRef: rule.code,
			});
		}
	}

	return { employeeStatutory, employerContributions };
}

function applyEmployerContributions(
	ctx: CalculationContext,
	contributions: PendingEmployerContribution[],
): void {
	for (const contribution of contributions) {
		pushLine(ctx, {
			lineKind: "employer_contribution",
			code: contribution.code,
			ruleCode: contribution.code,
			ruleVersion: contribution.ruleVersion,
			ruleKind: "statutory",
			amount: contribution.amount,
			currencyCode: ctx.snapshot.currencyCode,
			sourceType: "statutory_rule",
			sourceId: contribution.ruleId,
			traceStage: "employer_contributions",
			traceMessage: `Employer statutory ${contribution.code}`,
		});
	}
	addTrace(ctx, {
		stage: "employer_contributions",
		message: "Completed employer contributions",
		amount: sumLineAmounts(ctx.lines, ["employer_contribution"]),
	});
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

	for (const overtime of snapshot.approvedWorkFacts.overtimeFacts) {
		const payableMinutes =
			overtime.payrollApprovedMinutes ?? overtime.approvedMinutes;
		if (payableMinutes > 0) {
			addException(ctx, {
				exceptionCode: "UNPRICED_APPROVED_OVERTIME",
				message:
					"Approved overtime requires an applicable finalized payroll rule",
				sourceRef: overtime.timesheetId,
			});
		}
	}

	const containsUnpricedUnpaidTime =
		(snapshot.approvedWorkFacts.timeFacts?.unpaidMinutes ?? 0) > 0 ||
		(snapshot.approvedWorkFacts.timeFacts?.unpaidLeaveMinutes ?? 0) > 0 ||
		snapshot.approvedWorkFacts.leaveFacts.some((fact) => !fact.paid);
	if (containsUnpricedUnpaidTime) {
		addException(ctx, {
			exceptionCode: "UNPRICED_APPROVED_UNPAID_TIME",
			message:
				"Approved unpaid time requires an applicable finalized payroll rule",
			sourceRef:
				snapshot.approvedWorkFacts.timeFacts?.timesheetId ??
				snapshot.employeeId,
		});
	}

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
	const statutory = calculateStatutory({
		ctx,
		gross,
		preTaxDeductions,
	});
	calculateDeductions({
		ctx,
		gross,
		taxTiming: "post_tax",
	});
	applyApprovedEmployerBenefitContributions(ctx, gross);
	applyEmployerContributions(ctx, statutory.employerContributions);
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
