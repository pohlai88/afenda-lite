import { errorResult, type Result } from "@afenda/errors";

import type { PayrollEmployeeFacts } from "../../kernel/execution/ports";
import { parseApprovedPayrollHandoff } from "./parse-approved-payroll-handoff";

export interface PayrollWorkforceHandoffExpectation {
	effectiveDate: string;
	employeeId: string;
	organizationId: string;
	periodEnd?: string;
	periodStart?: string;
}

function invalidHandoff(): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Approved payroll workforce data is invalid",
	});
}

/** Canonical Payroll ingress for every current and historical HR handoff. */
export function normalizePayrollWorkforceHandoff(
	payload: unknown,
	expected: PayrollWorkforceHandoffExpectation,
): Result<PayrollEmployeeFacts> {
	const parsed = parseApprovedPayrollHandoff(payload);
	if (!parsed.ok) {
		return parsed;
	}

	const handoff = parsed.data;
	if (
		handoff.organizationId !== expected.organizationId ||
		handoff.employeeId !== expected.employeeId ||
		handoff.effectiveDate !== expected.effectiveDate ||
		handoff.employmentStatus === undefined
	) {
		return invalidHandoff();
	}

	if (
		(expected.periodStart === undefined) !==
		(expected.periodEnd === undefined)
	) {
		return invalidHandoff();
	}
	if (expected.periodStart !== undefined && expected.periodEnd !== undefined) {
		const { periodStart, periodEnd } = expected;
		if (
			handoff.timeFacts !== null &&
			(handoff.timeFacts.periodStart !== periodStart ||
				handoff.timeFacts.periodEnd !== periodEnd)
		) {
			return invalidHandoff();
		}
		if (
			handoff.leaveFacts.some(
				(fact) => fact.startDate > periodEnd || fact.endDate < periodStart,
			)
		) {
			return invalidHandoff();
		}
	}

	if (
		handoff.timeFacts !== null &&
		handoff.sourceVersion.timesheetVersion !==
			handoff.timeFacts.timesheetVersion
	) {
		return invalidHandoff();
	}
	if (handoff.overtimeFacts.length > 0) {
		const { timeFacts } = handoff;
		if (timeFacts === null) {
			return invalidHandoff();
		}
		if (
			handoff.overtimeFacts.some(
				(fact) =>
					fact.timesheetId !== timeFacts.timesheetId ||
					fact.sourceVersion !== timeFacts.timesheetVersion,
			)
		) {
			return invalidHandoff();
		}
	}

	return errorResult.ok({
		employeeId: handoff.employeeId,
		employmentStatus: handoff.employmentStatus,
		baseCompensation: handoff.baseAmount,
		currencyCode: handoff.currencyCode,
		recurringAllowances: [],
		recurringDeductions: handoff.components
			.filter((component) => component.kind === "benefit_employee_contribution")
			.map(({ code, amount }) => ({ code, amount })),
		approvedHandoff: handoff,
	});
}
