import { errorResult, type Result } from "@afenda/errors";

import type { PayrollResultLine } from "../../kernel/contracts/projected-types";
import {
	calculateEmployeePayroll,
	formatScaledToDecimal,
	hashSnapshot,
	type NormalizedPayrollEmployeeCalcOutput,
	normalizeCalcOutput,
	type PayrollEmployeeCalcSnapshot,
	parseDecimalToScaled,
	payrollEmployeeCalcSnapshotSchema,
	subScaled,
} from "../calculation/calculation";
import type {
	PayrollRetroCorrection,
	PayrollRetroDifference,
	PayrollRetroDifferenceLine,
} from "./contract";

interface AggregateKeyParts {
	code: string;
	currencyCode: string;
	lineKind: PayrollRetroDifferenceLine["lineKind"];
	ruleCode: string;
	ruleKind: PayrollRetroDifferenceLine["ruleKind"];
	ruleVersion: string;
}

/**
 * NUL separator, written as a source escape so the file stays plain ASCII.
 *
 * `code` and `ruleCode` are free text up to 64 characters, so any printable
 * separator lets two distinct rules serialise to the same key and silently
 * merge their retro amounts. No domain field may contain NUL.
 */
const AGGREGATE_KEY_SEPARATOR = "\u0000";

export function aggregateKey(parts: AggregateKeyParts): string {
	return [
		parts.lineKind,
		parts.code,
		parts.ruleCode,
		parts.ruleVersion,
		parts.ruleKind,
		parts.currencyCode,
	].join(AGGREGATE_KEY_SEPARATOR);
}

function aggregate(
	lines: readonly (AggregateKeyParts & { amount: string })[],
): Map<string, { amount: bigint; parts: AggregateKeyParts }> {
	const totals = new Map<
		string,
		{ amount: bigint; parts: AggregateKeyParts }
	>();
	for (const line of lines) {
		const parts: AggregateKeyParts = {
			code: line.code,
			currencyCode: line.currencyCode,
			lineKind: line.lineKind,
			ruleCode: line.ruleCode,
			ruleKind: line.ruleKind,
			ruleVersion: line.ruleVersion,
		};
		const key = aggregateKey(parts);
		const current = totals.get(key);
		const scaled = parseDecimalToScaled(line.amount);
		totals.set(key, {
			amount: current === undefined ? scaled : current.amount + scaled,
			parts,
		});
	}
	return totals;
}

function sealedRecomputeMatches(
	recomputed: NormalizedPayrollEmployeeCalcOutput,
	sealed: readonly PayrollResultLine[],
): boolean {
	const left = aggregate(recomputed.lines);
	const right = aggregate(sealed);
	if (left.size !== right.size) {
		return false;
	}
	for (const [key, entry] of left) {
		const counterpart = right.get(key);
		if (counterpart === undefined || counterpart.amount !== entry.amount) {
			return false;
		}
	}
	return true;
}

function applyCorrection(
	snapshot: PayrollEmployeeCalcSnapshot,
	correction: PayrollRetroCorrection,
	retroItemId: string,
): PayrollEmployeeCalcSnapshot {
	if (correction.kind === "base_compensation") {
		return {
			...snapshot,
			employee: {
				...snapshot.employee,
				baseCompensation: correction.amount,
			},
		};
	}
	return {
		...snapshot,
		variableInputs: [
			...snapshot.variableInputs,
			{
				amount: correction.amount,
				currencyCode: correction.currencyCode,
				earningRuleCode: correction.earningRuleCode,
				earningRuleId: correction.earningRuleId,
				earningRuleVersion: correction.earningRuleVersion,
				id: retroItemId,
				sourceId: correction.sourceId,
				sourceType: correction.sourceType,
			},
		].sort((left, right) => left.id.localeCompare(right.id)),
	};
}

function firstBlockingException(
	output: NormalizedPayrollEmployeeCalcOutput,
): string | null {
	const blocking = output.exceptions.find(
		(exception) => exception.severity === "blocking",
	);
	return blocking === undefined
		? null
		: `${blocking.exceptionCode}: ${blocking.message}`;
}

function diffTotals(
	corrected: NormalizedPayrollEmployeeCalcOutput,
	sealed: NormalizedPayrollEmployeeCalcOutput,
): PayrollRetroDifference["totals"] {
	const delta = (key: keyof NormalizedPayrollEmployeeCalcOutput["totals"]) =>
		formatScaledToDecimal(
			subScaled(
				parseDecimalToScaled(corrected.totals[key]),
				parseDecimalToScaled(sealed.totals[key]),
			),
		);
	return {
		employeeDeductions: delta("employeeDeductions"),
		employeeStatutory: delta("employeeStatutory"),
		employerCost: delta("employerCost"),
		gross: delta("gross"),
		net: delta("net"),
	};
}

function diffLines(
	corrected: NormalizedPayrollEmployeeCalcOutput,
	sealed: NormalizedPayrollEmployeeCalcOutput,
): PayrollRetroDifferenceLine[] {
	const correctedTotals = aggregate(corrected.lines);
	const sealedTotals = aggregate(sealed.lines);
	const keys = [
		...new Set([...correctedTotals.keys(), ...sealedTotals.keys()]),
	].sort();

	const lines: PayrollRetroDifferenceLine[] = [];
	for (const key of keys) {
		const correctedEntry = correctedTotals.get(key);
		const sealedEntry = sealedTotals.get(key);
		const parts = correctedEntry?.parts ?? sealedEntry?.parts;
		if (parts === undefined) {
			continue;
		}
		const delta = subScaled(
			correctedEntry?.amount ?? 0n,
			sealedEntry?.amount ?? 0n,
		);
		if (delta === 0n) {
			continue;
		}
		lines.push({
			amount: formatScaledToDecimal(delta),
			code: parts.code,
			currencyCode: parts.currencyCode,
			lineKind: parts.lineKind,
			ruleCode: parts.ruleCode,
			ruleKind: parts.ruleKind,
			ruleVersion: parts.ruleVersion,
		});
	}
	return lines;
}

/**
 * Recomputes a sealed period under its own persisted snapshot.
 *
 * The snapshot pins every earning, deduction, and statutory rule version the
 * sealed run used, so this recompute can never observe a rate that was
 * introduced after the period closed. The unmodified recompute is compared
 * against the sealed result lines first: if history is not reproducible, the
 * retro difference is refused rather than approximated.
 */
export function recomputeRetroDifference(input: {
	correction: PayrollRetroCorrection;
	retroItemId: string;
	sealedCalculationVersion: string;
	sealedResultLines: readonly PayrollResultLine[];
	sealedSnapshotHash: string;
	sealedSnapshotJson: unknown;
}): Result<PayrollRetroDifference> {
	const parsed = payrollEmployeeCalcSnapshotSchema.safeParse(
		input.sealedSnapshotJson,
	);
	if (!parsed.success) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The sealed payroll snapshot cannot be recomputed under its pinned rule version",
		});
	}
	const snapshot: PayrollEmployeeCalcSnapshot = parsed.data;

	if (snapshot.calculationVersion !== input.sealedCalculationVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The sealed payroll snapshot cannot be recomputed under its pinned rule version",
		});
	}

	if (hashSnapshot(snapshot) !== input.sealedSnapshotHash) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The sealed payroll snapshot failed its integrity check",
		});
	}

	const sealedOutput = normalizeCalcOutput(calculateEmployeePayroll(snapshot));
	if (firstBlockingException(sealedOutput) !== null) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The sealed payroll snapshot cannot be recomputed under its pinned rule version",
		});
	}
	if (!sealedRecomputeMatches(sealedOutput, input.sealedResultLines)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The sealed payroll period is not reproducible",
		});
	}

	const corrected = applyCorrection(
		snapshot,
		input.correction,
		input.retroItemId,
	);
	const correctedOutput = normalizeCalcOutput(
		calculateEmployeePayroll(corrected),
	);
	if (firstBlockingException(correctedOutput) !== null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The retro correction is not payable in the sealed period",
		});
	}

	return errorResult.ok({
		calculationVersion: input.sealedCalculationVersion,
		correctedSnapshotHash: hashSnapshot(corrected),
		currencyCode: snapshot.currencyCode,
		lines: diffLines(correctedOutput, sealedOutput),
		sealedSnapshotHash: input.sealedSnapshotHash,
		totals: diffTotals(correctedOutput, sealedOutput),
	});
}
