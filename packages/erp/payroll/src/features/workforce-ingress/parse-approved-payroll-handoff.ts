import { errorResult, type Result } from "@afenda/errors";
import {
	type ApprovedPayrollHandoff,
	approvedPayrollHandoffSchema,
	type HandoffApprovalEvidence,
	type HandoffAssignment,
	type HandoffCompensationComponent,
	type HandoffLeaveBalanceAtTermination,
	type HandoffLeaveFact,
	type HandoffOvertimeFact,
	type HandoffPayFrequency,
	type HandoffPriorEmployerYtd,
	type HandoffSourceVersion,
	type HandoffStatutoryProfile,
	type HandoffTimeFacts,
	handoffDecimalScaleMatchesAmount,
} from "@afenda/events/schemas";
import {
	formatScaledToHandoffAmount,
	parseDecimalToScaled,
} from "../../kernel/money/money";
import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";

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
	employmentStatus: ApprovedPayrollHandoff["employmentStatus"];
	leaveBalanceAtTermination: HandoffLeaveBalanceAtTermination | null;
	leaveFacts: readonly HandoffLeaveFact[];
	organizationId: string;
	overtimeFacts: readonly HandoffOvertimeFact[];
	payFrequency: HandoffPayFrequency;
	priorEmployerYtd: readonly HandoffPriorEmployerYtd[];
	roundingMode: ApprovedPayrollHandoff["roundingMode"];
	roundingPolicy: PayrollRoundingPolicy;
	sourceVersion: HandoffSourceVersion;
	statutoryProfile: HandoffStatutoryProfile | null;
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}

	let scaled: bigint;
	try {
		scaled = parseDecimalToScaled(input.amount);
	} catch {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}

	const roundTrip = formatScaledToHandoffAmount(scaled, input.decimalScale);
	if (roundTrip !== input.amount) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}

	return errorResult.ok({ amount: input.amount, scaled });
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

	return errorResult.ok({
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid approved payroll handoff input.",
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

	return errorResult.ok({
		contractVersion: handoff.contractVersion,
		organizationId: handoff.organizationId,
		employeeId: handoff.employeeId,
		employmentId: handoff.employmentId,
		employmentStatus: handoff.employmentStatus,
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
		leaveBalanceAtTermination: handoff.leaveBalanceAtTermination ?? null,
		leaveFacts: handoff.leaveFacts,
		priorEmployerYtd: handoff.priorEmployerYtd ?? [],
		statutoryProfile: handoff.statutoryProfile ?? null,
		timeFacts: handoff.timeFacts,
		overtimeFacts: handoff.overtimeFacts,
		sourceVersion: handoff.sourceVersion,
		approvalEvidence: handoff.approvalEvidence,
	});
}

/** Alias for `parseApprovedPayrollHandoff` (Slice 8.8 ingest entry point). */
export const parseApprovedPayrollHandoffInput = parseApprovedPayrollHandoff;
