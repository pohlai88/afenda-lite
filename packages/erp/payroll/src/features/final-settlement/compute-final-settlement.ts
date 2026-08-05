import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import {
	addScaled,
	divScaled,
	formatScaledToDecimal,
	mulScaled,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
import { DEFAULT_PAYROLL_ROUNDING_POLICY } from "../../kernel/money/rounding-policy";
import type {
	PayrollFinalSettlementFacts,
	PayrollFinalSettlementLine,
	PayrollFinalSettlementTotals,
} from "./contract";

const MS_PER_DAY = 86_400_000;

export function inclusiveDayCount(start: string, end: string): number {
	const startUtc = Date.parse(`${start}T00:00:00.000Z`);
	const endUtc = Date.parse(`${end}T00:00:00.000Z`);
	return Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
}

function roundMoney(value: bigint): string {
	return formatScaledToDecimal(
		roundScaled(value, DEFAULT_PAYROLL_ROUNDING_POLICY),
	);
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

export function computeFinalSettlement(input: {
	facts: PayrollFinalSettlementFacts;
	now: Date;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	settlementId: string;
	terminationEffectiveOn: string;
}): Result<{
	lines: PayrollFinalSettlementLine[];
	totals: PayrollFinalSettlementTotals;
}> {
	const daysInPeriod = inclusiveDayCount(input.periodStart, input.periodEnd);
	if (daysInPeriod <= 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The payroll period has no payable days",
		});
	}

	const daysWorked = workedDays(input);
	const periodDays = parseDecimalToScaled(String(daysInPeriod));
	const worked = parseDecimalToScaled(String(daysWorked));
	const { facts } = input;
	const { baseCompensation, currencyCode, leaveBalanceDays } = facts;
	const base = parseDecimalToScaled(baseCompensation);
	const dailyRate = divScaled(base, periodDays);

	const earningEntries: Array<{
		amount: bigint;
		code: string;
		kind: PayrollFinalSettlementLine["kind"];
	}> = [
		{
			amount: mulScaled(dailyRate, worked),
			code: "PRORATED_BASE",
			kind: "prorated_base",
		},
		{
			amount: mulScaled(dailyRate, parseDecimalToScaled(leaveBalanceDays)),
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

	const recoveryEntries = facts.recoveries.map((recovery) => ({
		amount: parseDecimalToScaled(recovery.amount),
		code: recovery.code,
		kind: "recovery" as const,
	}));

	const employeeStatutory = parseDecimalToScaled(facts.employeeStatutoryAmount);
	const employerStatutory = parseDecimalToScaled(facts.employerStatutoryAmount);

	let grossScaled = 0n;
	let recoveryScaled = 0n;
	const lines: PayrollFinalSettlementLine[] = [];
	let sequence = 1;

	for (const entry of earningEntries) {
		const amount = roundMoney(entry.amount);
		grossScaled = addScaled(grossScaled, parseDecimalToScaled(amount));
		lines.push({
			amount,
			code: entry.code,
			createdAt: input.now,
			currencyCode,
			id: randomUUID(),
			kind: entry.kind,
			organizationId: input.organizationId,
			sequence,
			settlementId: input.settlementId,
		});
		sequence += 1;
	}

	for (const entry of recoveryEntries) {
		const amount = roundMoney(entry.amount);
		recoveryScaled = addScaled(recoveryScaled, parseDecimalToScaled(amount));
		lines.push({
			amount,
			code: entry.code,
			createdAt: input.now,
			currencyCode,
			id: randomUUID(),
			kind: entry.kind,
			organizationId: input.organizationId,
			sequence,
			settlementId: input.settlementId,
		});
		sequence += 1;
	}

	const employeeStatutoryAmount = roundMoney(employeeStatutory);
	lines.push({
		amount: employeeStatutoryAmount,
		code: "EMPLOYEE_STATUTORY",
		createdAt: input.now,
		currencyCode,
		id: randomUUID(),
		kind: "employee_statutory",
		organizationId: input.organizationId,
		sequence,
		settlementId: input.settlementId,
	});
	sequence += 1;

	const employerStatutoryAmount = roundMoney(employerStatutory);
	lines.push({
		amount: employerStatutoryAmount,
		code: "EMPLOYER_STATUTORY",
		createdAt: input.now,
		currencyCode,
		id: randomUUID(),
		kind: "employer_statutory",
		organizationId: input.organizationId,
		sequence,
		settlementId: input.settlementId,
	});

	const gross = roundMoney(grossScaled);
	const recoveries = roundMoney(recoveryScaled);
	const net = roundMoney(
		subScaled(
			subScaled(parseDecimalToScaled(gross), parseDecimalToScaled(recoveries)),
			parseDecimalToScaled(employeeStatutoryAmount),
		),
	);

	return errorResult.ok({
		lines,
		totals: {
			employeeStatutory: employeeStatutoryAmount,
			employerStatutory: employerStatutoryAmount,
			gross,
			net,
			recoveries,
		},
	});
}
