import { describe, expect, it } from "vitest";

import {
	AllEventSchemas,
	approvedPayrollHandoffSchema,
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
} from "../src/schemas";

const validHandoff = {
	contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
	organizationId: "org-1",
	employeeId: "emp-1",
	employmentId: "employment-1",
	assignment: {
		assignmentId: "assignment-1",
		positionId: "position-1",
		departmentId: "dept-1",
		locationKey: null,
		legalEntityKey: "le-1",
	},
	effectiveDate: "2025-01-01",
	currencyCode: "USD",
	baseAmount: "85000.00",
	decimalScale: 2,
	roundingMode: "half_even" as const,
	payFrequency: "monthly" as const,
	components: [
		{
			code: "base",
			kind: "base" as const,
			amount: "85000.00",
			currencyCode: "USD",
			decimalScale: 2,
			sourceType: "hr_employee_compensation",
			sourceId: "comp-1",
			sourceVersion: 1,
		},
	],
	leaveFacts: [],
	timeFacts: null,
	overtimeFacts: [],
	sourceVersion: {
		compensationVersion: 1,
	},
	approvalEvidence: {
		approvedAt: "2025-01-02T10:00:00.000Z",
		approvedBy: "actor-1",
		correlationId: "corr-1",
	},
};

describe("hr payroll handoff contract", () => {
	it("accepts a valid approved payroll handoff fixture", () => {
		const parsed = approvedPayrollHandoffSchema.safeParse(validHandoff);
		expect(parsed.success).toBe(true);
	});

	it("derives decimal scale from money amounts", () => {
		expect(deriveHandoffDecimalScale("85000")).toBe(0);
		expect(deriveHandoffDecimalScale("85000.00")).toBe(2);
		expect(deriveHandoffDecimalScale("12.3454")).toBe(4);
	});

	it("rejects scale mismatch on envelope", () => {
		const parsed = approvedPayrollHandoffSchema.safeParse({
			...validHandoff,
			decimalScale: 0,
		});
		expect(parsed.success).toBe(false);
	});

	it("accepts D0 statutory profile, prior-employer YTD, and leave balance", () => {
		const parsed = approvedPayrollHandoffSchema.safeParse({
			...validHandoff,
			statutoryProfile: {
				profileId: "stat-1",
				jurisdictionCode: "MY",
				taxResidencyStatus: "resident",
				nationalityCountryCode: "MY",
				expatriate: false,
				minimumWageZone: null,
				taxFileNumber: "SG123",
				employeeProvidentFundNumber: "EPF-1",
				socialSecurityNumber: "SOCSO-1",
				socialInsuranceBookNumber: null,
				dependantCount: 1,
				reliefDeclarations: [
					{
						reliefCode: "child",
						amount: "2000.00",
						currencyCode: "MYR",
						dependantReference: "dep-1",
						evidenceRef: null,
					},
				],
				reliefDeclarationVersion: "hr.statutory-relief.v1",
				sourceVersion: 3,
			},
			priorEmployerYtd: [
				{
					taxYear: 2025,
					jurisdictionCode: "MY",
					priorEmployerName: "Acme Sdn Bhd",
					grossAmount: "12000.00",
					taxWithheldAmount: "800.00",
					statutoryContributionAmount: "600.00",
					currencyCode: "MYR",
					recordedOn: "2025-03-15",
				},
			],
			leaveBalanceAtTermination: {
				days: "4.5",
				asOf: "2025-06-30",
			},
			sourceVersion: {
				compensationVersion: 1,
				statutoryProfileVersion: 3,
			},
		});
		expect(parsed.success).toBe(true);
	});

	it("registers typed payload for payroll handoff ready event", () => {
		expect(
			AllEventSchemas[HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT],
		).toBe(approvedPayrollHandoffSchema);
		const eventParsed =
			AllEventSchemas[
				HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT
			].safeParse(validHandoff);
		expect(eventParsed.success).toBe(true);
	});
});
