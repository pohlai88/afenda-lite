import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import {
	addScaled,
	divScaled,
	formatScaledToDecimal,
	mulScaledWithRounding,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";
import type {
	PayrollFinalSettlementCompensationSnapshot,
	PayrollFinalSettlementFacts,
	PayrollFinalSettlementLine,
	PayrollFinalSettlementStatutoryEvidenceEntry,
	PayrollFinalSettlementTotals,
} from "./contract";

const MS_PER_DAY = 86_400_000;

export function inclusiveDayCount(start: string, end: string): number {
	const startUtc = Date.parse(`${start}T00:00:00.000Z`);
	const endUtc = Date.parse(`${end}T00:00:00.000Z`);
	return Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
}

function workedDays(input: {
	periodEnd: string;
	periodStart: string;
	terminationEffectiveOn: string;
}): number {
	if (input.terminationEffectiveOn < input.periodStart) {
		return 0;
	}
	const lastWorkedDay =
		input.terminationEffectiveOn < input.periodEnd
			? input.terminationEffectiveOn
			: input.periodEnd;
	return inclusiveDayCount(input.periodStart, lastWorkedDay);
}

/**
 * Statutory resolution seam. The settlement never accepts caller-supplied
 * statutory amounts: the command hands in a resolver backed by the same
 * fail-closed calculator capability payroll runs use, and it is invoked with
 * the settlement's own gross once the payable components are known.
 */
export type PayrollFinalSettlementStatutoryResolver = (input: {
	currencyCode: string;
	grossScaled: bigint;
	roundingPolicy: PayrollRoundingPolicy;
}) => Result<{
	employeeScaled: bigint;
	employerScaled: bigint;
	evidence: readonly PayrollFinalSettlementStatutoryEvidenceEntry[];
}>;

interface ComputedEntry {
	amount: bigint;
	code: string;
	kind: PayrollFinalSettlementLine["kind"];
}

/**
 * Prices a final settlement from its pinned compensation snapshot.
 *
 * One convention, one rounding per component: an unrounded scale-12 daily rate
 * is derived from the pinned base over the period's payable days, then each
 * component is multiplied and rounded exactly once under the pinned policy.
 * Pro-ration and leave encashment therefore share a single daily rate, and the
 * HR-delivered `leaveBalanceDays` is encashed verbatim — Payroll never derives
 * a leave balance.
 */
export function computeFinalSettlement(input: {
	compensationSnapshot: PayrollFinalSettlementCompensationSnapshot;
	facts: PayrollFinalSettlementFacts;
	now: Date;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	resolveStatutory: PayrollFinalSettlementStatutoryResolver;
	settlementId: string;
	terminationEffectiveOn: string;
}): Result<{
	lines: PayrollFinalSettlementLine[];
	statutoryEvidence: readonly PayrollFinalSettlementStatutoryEvidenceEntry[];
	totals: PayrollFinalSettlementTotals;
}> {
	const daysInPeriod = inclusiveDayCount(input.periodStart, input.periodEnd);
	if (daysInPeriod <= 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The payroll period has no payable days",
		});
	}

	const { compensationSnapshot: pinned, facts } = input;
	const policy = pinned.roundingPolicy;
	const round = (value: bigint): string =>
		formatScaledToDecimal(roundScaled(value, policy));

	const dailyRate = divScaled(
		parseDecimalToScaled(pinned.baseCompensation),
		parseDecimalToScaled(String(daysInPeriod)),
	);

	const earningEntries: ComputedEntry[] = [
		{
			amount: mulScaledWithRounding(
				dailyRate,
				parseDecimalToScaled(String(workedDays(input))),
				policy,
			),
			code: "PRORATED_BASE",
			kind: "prorated_base",
		},
		{
			amount: mulScaledWithRounding(
				dailyRate,
				parseDecimalToScaled(facts.leaveBalanceDays),
				policy,
			),
			code: "LEAVE_ENCASHMENT",
			kind: "leave_encashment",
		},
		{
			amount: parseDecimalToScaled(facts.noticePayAmount),
			code: "NOTICE_PAY",
			kind: "notice_pay",
		},
		{
			amount: parseDecimalToScaled(facts.noticeInLieuAmount),
			code: "NOTICE_IN_LIEU",
			kind: "notice_in_lieu",
		},
	];

	const lines: PayrollFinalSettlementLine[] = [];
	let sequence = 1;
	const push = (entry: ComputedEntry, amount: string): void => {
		lines.push({
			amount,
			code: entry.code,
			createdAt: input.now,
			currencyCode: pinned.currencyCode,
			id: randomUUID(),
			kind: entry.kind,
			organizationId: input.organizationId,
			sequence,
			settlementId: input.settlementId,
		});
		sequence += 1;
	};

	let grossScaled = 0n;
	for (const entry of earningEntries) {
		const amount = round(entry.amount);
		grossScaled = addScaled(grossScaled, parseDecimalToScaled(amount));
		push(entry, amount);
	}

	let recoveryScaled = 0n;
	for (const recovery of facts.recoveries) {
		const amount = round(parseDecimalToScaled(recovery.amount));
		recoveryScaled = addScaled(recoveryScaled, parseDecimalToScaled(amount));
		push(
			{
				amount: parseDecimalToScaled(amount),
				code: recovery.code,
				kind: "recovery",
			},
			amount,
		);
	}

	const statutory = input.resolveStatutory({
		currencyCode: pinned.currencyCode,
		grossScaled,
		roundingPolicy: policy,
	});
	if (!statutory.ok) {
		return statutory;
	}

	const employeeStatutory = round(statutory.data.employeeScaled);
	push(
		{
			amount: statutory.data.employeeScaled,
			code: "EMPLOYEE_STATUTORY",
			kind: "employee_statutory",
		},
		employeeStatutory,
	);
	const employerStatutory = round(statutory.data.employerScaled);
	push(
		{
			amount: statutory.data.employerScaled,
			code: "EMPLOYER_STATUTORY",
			kind: "employer_statutory",
		},
		employerStatutory,
	);

	const gross = round(grossScaled);
	const recoveries = round(recoveryScaled);
	const net = round(
		subScaled(
			subScaled(parseDecimalToScaled(gross), parseDecimalToScaled(recoveries)),
			parseDecimalToScaled(employeeStatutory),
		),
	);

	return errorResult.ok({
		lines,
		statutoryEvidence: statutory.data.evidence,
		totals: {
			employeeStatutory,
			employerStatutory,
			gross,
			net,
			recoveries,
		},
	});
}
