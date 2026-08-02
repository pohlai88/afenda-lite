import {
	type ApprovedPayrollHandoff,
	DEFAULT_HANDOFF_ROUNDING_MODE,
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";

const BASE_ASSIGNMENT = {
	assignmentId: "asgn-synth-1",
	positionId: "pos-synth-1",
} as const;

const BASE_APPROVAL = {
	approvedAt: "2025-01-15T10:00:00.000Z",
	approvedBy: "user-synth-approver",
	correlationId: "corr-synth-handoff",
} as const;

export function buildSyntheticHandoff(
	overrides: Partial<ApprovedPayrollHandoff> = {},
): ApprovedPayrollHandoff {
	const baseAmount = overrides.baseAmount ?? "85000";
	const decimalScale =
		overrides.decimalScale ?? deriveHandoffDecimalScale(baseAmount);

	return {
		contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
		organizationId: "org-synth-handoff",
		employeeId: "emp-synth-handoff",
		employmentId: "employ-synth-handoff",
		employmentStatus: "active",
		assignment: BASE_ASSIGNMENT,
		effectiveDate: "2025-01-01",
		currencyCode: "USD",
		baseAmount,
		decimalScale,
		roundingMode: DEFAULT_HANDOFF_ROUNDING_MODE,
		payFrequency: "monthly",
		components: [
			{
				code: "base",
				kind: "base",
				amount: baseAmount,
				currencyCode: "USD",
				decimalScale,
				sourceType: "hr_employee_compensation",
				sourceId: "comp-synth-1",
				sourceVersion: 1,
			},
		],
		leaveFacts: [],
		timeFacts: null,
		overtimeFacts: [],
		sourceVersion: { compensationVersion: 1 },
		approvalEvidence: BASE_APPROVAL,
		...overrides,
	};
}

export const HANDOFF_FIXTURE_P1 = buildSyntheticHandoff({
	baseAmount: "85000",
	decimalScale: 0,
	effectiveDate: "2025-01-01",
});

export const HANDOFF_FIXTURE_P2 = buildSyntheticHandoff({
	baseAmount: "1234.5678",
	decimalScale: 4,
	effectiveDate: "2025-06-15",
	components: [
		{
			code: "base",
			kind: "base",
			amount: "1234.5678",
			currencyCode: "USD",
			decimalScale: 4,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-synth-2",
			sourceVersion: 1,
		},
	],
});

export const HANDOFF_FIXTURE_P3 = buildSyntheticHandoff({
	baseAmount: "470.12",
	decimalScale: 2,
	components: [
		{
			code: "base",
			kind: "base",
			amount: "470.12",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-synth-3",
			sourceVersion: 1,
		},
	],
});

export const HANDOFF_FIXTURE_P4 = buildSyntheticHandoff({
	baseAmount: "100.10",
	decimalScale: 2,
	components: [
		{
			code: "base",
			kind: "base",
			amount: "100.10",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-synth-4",
			sourceVersion: 1,
		},
	],
});

export const HANDOFF_FIXTURE_P5 = buildSyntheticHandoff({
	baseAmount: "85000",
	decimalScale: 0,
	components: [
		{
			code: "base",
			kind: "base",
			amount: "85000",
			currencyCode: "USD",
			decimalScale: 0,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-synth-5",
			sourceVersion: 1,
		},
		{
			code: "benefit-plan-med",
			kind: "benefit_employee_contribution",
			amount: "125.50",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_benefit_enrollment",
			sourceId: "enrol-synth-ee",
			sourceVersion: 1,
		},
		{
			code: "benefit-plan-med",
			kind: "benefit_employer_contribution",
			amount: "300.00",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_benefit_enrollment",
			sourceId: "enrol-synth-er",
			sourceVersion: 1,
		},
	],
});

export const HANDOFF_FIXTURE_P6 = buildSyntheticHandoff({
	baseAmount: "5000",
	decimalScale: 0,
	effectiveDate: "2024-12-31",
});

export const HANDOFF_FIXTURE_P7 = buildSyntheticHandoff({
	leaveFacts: [
		{
			requestId: "leave-req-synth-1",
			policyId: "policy-synth-1",
			policyVersion: 2,
			paid: true,
			unit: "days",
			startDate: "2025-01-30",
			endDate: "2025-02-02",
			quantity: "2",
			segments: [
				{ date: "2025-01-30", quantity: "1", dayPortion: "full" },
				{ date: "2025-01-31", quantity: "0.5", dayPortion: "half" },
				{ date: "2025-02-01", quantity: "0.5", dayPortion: "half" },
			],
			approvedAt: "2025-01-28T08:00:00.000Z",
			correlationId: "corr-leave-synth-1",
		},
	],
	sourceVersion: { compensationVersion: 1, leavePolicyVersion: 2 },
});

export const HANDOFF_FIXTURE_P8 = buildSyntheticHandoff({
	timeFacts: {
		timesheetId: "ts-synth-1",
		periodStart: "2025-01-01",
		periodEnd: "2025-01-31",
		regularMinutes: 9600,
		publicHolidayMinutes: 0,
		restDayMinutes: 0,
		nightMinutes: 0,
		unpaidMinutes: 0,
		paidLeaveMinutes: 480,
		unpaidLeaveMinutes: 0,
		timesheetVersion: 3,
		approvedAt: "2025-02-01T12:00:00.000Z",
		approvalReference: "ts-approval-synth-1",
	},
	overtimeFacts: [
		{
			overtimeType: "weekday_overtime",
			approvedMinutes: 120,
			timesheetId: "ts-synth-1",
			sourceVersion: 3,
		},
	],
	sourceVersion: { compensationVersion: 1, timesheetVersion: 3 },
});

export const HANDOFF_FIXTURE_P11 = buildSyntheticHandoff({
	timeFacts: null,
	overtimeFacts: [],
});

/** Slice 8.7 golden contract shared by parser smoke tests. */
export const HANDOFF_FIXTURE_SLICE_87 = buildSyntheticHandoff({
	organizationId: "org-1",
	employeeId: "emp-1",
	employmentId: "employment-1",
	assignment: {
		assignmentId: "assignment-1",
		positionId: "position-1",
		departmentId: "dept-1",
		locationKey: "hq",
		legalEntityKey: "le-1",
	},
	baseAmount: "85000.00",
	decimalScale: 2,
	components: [
		{
			code: "base",
			kind: "base",
			amount: "85000.00",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-1",
			sourceVersion: 2,
		},
	],
	sourceVersion: {
		compensationVersion: 2,
	},
	approvalEvidence: {
		approvedAt: "2025-01-02T10:00:00.000Z",
		approvedBy: "actor-1",
		correlationId: "corr-handoff",
	},
});

export const HANDOFF_FIXTURE_P9 = buildSyntheticHandoff({
	baseAmount: "1.23",
	decimalScale: 4,
});

export const HANDOFF_FIXTURE_P10 = {
	...buildSyntheticHandoff(),
	baseAmount: "1.2.3",
	components: [
		{
			code: "base",
			kind: "base" as const,
			amount: "1.2.3",
			currencyCode: "USD",
			decimalScale: 1,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-synth-invalid",
			sourceVersion: 1,
		},
	],
};
