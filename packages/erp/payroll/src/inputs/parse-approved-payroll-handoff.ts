import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	approvedPayrollHandoffSchema,
	type HandoffApprovalEvidence,
	type HandoffAssignment,
	type HandoffCompensationComponent,
	type HandoffLeaveFact,
	type HandoffOvertimeFact,
	type HandoffPayFrequency,
	type HandoffSourceVersion,
	type HandoffTimeFacts,
	handoffDecimalScaleMatchesAmount,
} from "@afenda/events/schemas";

import { PAYROLL_ERROR_VALIDATION, payrollErrorDetails } from "../error-codes";
import {
	formatScaledToHandoffAmount,
	parseDecimalToScaled,
} from "../shared/money";
import type { PayrollRoundingPolicy } from "../shared/rounding-policy";

export interface ApprovedPayrollHandoffParsedComponent {
	amount: string;
	amountScaled: bigint;
	code: string;
	currencyCode: string;
	decimalScale: number;
	kind: HandoffCompensationComponent["kind"];
	sourceId: string;
	sourceType: string;
	sourceVersion: number;
}

export interface ApprovedPayrollHandoffParsed {
	approvalEvidence: HandoffApprovalEvidence;
	assignment: HandoffAssignment;
	baseAmount: string;
	baseAmountScaled: bigint;
	components: ApprovedPayrollHandoffParsedComponent[];
	contractVersion: ApprovedPayrollHandoff["contractVersion"];
	currencyCode: string;
	decimalScale: number;
	effectiveDate: string;
	employeeId: string;
	employmentId: string;
	leaveFacts: readonly HandoffLeaveFact[];
	organizationId: string;
	overtimeFacts: readonly HandoffOvertimeFact[];
	payFrequency: HandoffPayFrequency;
	roundingMode: ApprovedPayrollHandoff["roundingMode"];
	roundingPolicy: PayrollRoundingPolicy;
	sourceVersion: HandoffSourceVersion;
	timeFacts: HandoffTimeFacts | null;
}

export type ParsedApprovedPayrollHandoffInput = ApprovedPayrollHandoffParsed;
export type ParsedPayrollHandoffComponent =
	ApprovedPayrollHandoffParsedComponent;

function parseHandoffAmount(input: {
	amount: string;
	decimalScale: number;
	field: string;
}): Result<{ amount: string; scaled: bigint }> {
	if (!handoffDecimalScaleMatchesAmount(input.amount, input.decimalScale)) {
		return fail(
			"BAD_REQUEST",
			`${input.field} decimal scale does not match amount.`,
			payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
		);
	}

	let scaled: bigint;
	try {
		scaled = parseDecimalToScaled(input.amount);
	} catch {
		return fail(
			"BAD_REQUEST",
			`${input.field} is not a valid payroll decimal.`,
			payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
		);
	}

	const roundTrip = formatScaledToHandoffAmount(scaled, input.decimalScale);
	if (roundTrip !== input.amount) {
		return fail(
			"BAD_REQUEST",
			`${input.field} does not round-trip through payroll money scale.`,
			payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
		);
	}

	return ok({ amount: input.amount, scaled });
}

function parseComponent(
	component: HandoffCompensationComponent,
): Result<ApprovedPayrollHandoffParsedComponent> {
	const parsedAmount = parseHandoffAmount({
		amount: component.amount,
		decimalScale: component.decimalScale,
		field: `components.${component.code}.amount`,
	});
	if (!parsedAmount.ok) {
		return parsedAmount;
	}

	return ok({
		code: component.code,
		kind: component.kind,
		amount: parsedAmount.data.amount,
		amountScaled: parsedAmount.data.scaled,
		decimalScale: component.decimalScale,
		currencyCode: component.currencyCode,
		sourceType: component.sourceType,
		sourceId: component.sourceId,
		sourceVersion: component.sourceVersion,
	});
}

export function toPayrollRoundingPolicy(
	parsed: ApprovedPayrollHandoffParsed,
): PayrollRoundingPolicy {
	return parsed.roundingPolicy;
}

export function parseApprovedPayrollHandoff(
	input: unknown,
): Result<ApprovedPayrollHandoffParsed> {
	const parsed = approvedPayrollHandoffSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid approved payroll handoff input.", {
			...payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const handoff = parsed.data;

	const baseAmount = parseHandoffAmount({
		amount: handoff.baseAmount,
		decimalScale: handoff.decimalScale,
		field: "baseAmount",
	});
	if (!baseAmount.ok) {
		return baseAmount;
	}

	const components: ApprovedPayrollHandoffParsedComponent[] = [];
	for (const component of handoff.components) {
		const parsedComponent = parseComponent(component);
		if (!parsedComponent.ok) {
			return parsedComponent;
		}
		components.push(parsedComponent.data);
	}

	const roundingPolicy: PayrollRoundingPolicy = {
		scale: handoff.decimalScale,
		mode: handoff.roundingMode,
	};

	return ok({
		contractVersion: handoff.contractVersion,
		organizationId: handoff.organizationId,
		employeeId: handoff.employeeId,
		employmentId: handoff.employmentId,
		assignment: handoff.assignment,
		effectiveDate: handoff.effectiveDate,
		currencyCode: handoff.currencyCode,
		baseAmount: baseAmount.data.amount,
		baseAmountScaled: baseAmount.data.scaled,
		decimalScale: handoff.decimalScale,
		roundingMode: handoff.roundingMode,
		roundingPolicy,
		payFrequency: handoff.payFrequency,
		components,
		leaveFacts: handoff.leaveFacts,
		timeFacts: handoff.timeFacts,
		overtimeFacts: handoff.overtimeFacts,
		sourceVersion: handoff.sourceVersion,
		approvalEvidence: handoff.approvalEvidence,
	});
}

/** Alias for `parseApprovedPayrollHandoff` (Slice 8.8 ingest entry point). */
export const parseApprovedPayrollHandoffInput = parseApprovedPayrollHandoff;
