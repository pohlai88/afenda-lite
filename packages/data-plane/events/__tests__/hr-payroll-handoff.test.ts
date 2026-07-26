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

	it("registers typed payload for payroll handoff ready event", () => {
		expect(AllEventSchemas[HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT]).toBe(
			approvedPayrollHandoffSchema,
		);
		const eventParsed = AllEventSchemas[
			HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT
		].safeParse(validHandoff);
		expect(eventParsed.success).toBe(true);
	});
});
