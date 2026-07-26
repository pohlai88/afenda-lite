import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { approvedPayrollHandoffSchema } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { mapApprovedPayrollHandoff } from "../src/handoff/map-approved-payroll-handoff";
import type {
	ApprovedCompensationHandoff,
	ApprovedLeaveHandoff,
	ApprovedTimeHandoff,
	BenefitEnrollment,
	EmployeeCompensation,
	WorkAssignment,
} from "../src/types";

const compensation: EmployeeCompensation = {
	id: "comp-1" as EmployeeCompensation["id"],
	organizationId: "org-1",
	employeeId: "emp-1" as EmployeeCompensation["employeeId"],
	employmentId: "employment-1" as EmployeeCompensation["employmentId"],
	gradeId: null,
	salaryBandId: null,
	baseAmount: "85000.00",
	currencyCode: "USD",
	payFrequency: "monthly",
	effectiveFrom: "2025-01-01",
	effectiveTo: null,
	reason: "Initial hire",
	status: "active",
	confidentialNote: null,
	supersedesCompensationId: null,
	approvedAt: new Date("2025-01-02T10:00:00.000Z"),
	approvedBy: "actor-1",
	sourceReviewId: null,
	createIdempotencyKey: "idem-1",
	fingerprint: "fp-1",
	version: 2,
	createdBy: "actor-1",
	updatedBy: "actor-1",
	createdAt: new Date("2025-01-01T00:00:00.000Z"),
	updatedAt: new Date("2025-01-02T10:00:00.000Z"),
};

const benefitEnrollment: BenefitEnrollment = {
	id: "enroll-1" as BenefitEnrollment["id"],
	organizationId: "org-1",
	employeeId: compensation.employeeId,
	employmentId: compensation.employmentId,
	planId: "plan-1" as BenefitEnrollment["planId"],
	effectiveFrom: "2025-01-01",
	effectiveTo: null,
	status: "active",
	employeeContributionAmount: "100.00",
	employerContributionAmount: "200.00",
	contributionCurrencyCode: "USD",
	contributionFrequency: "monthly",
	waiverReason: null,
	createIdempotencyKey: "idem-enroll",
	fingerprint: "fp-enroll",
	version: 1,
	createdBy: "actor-1",
	updatedBy: "actor-1",
	createdAt: new Date("2025-01-01T00:00:00.000Z"),
	updatedAt: new Date("2025-01-01T00:00:00.000Z"),
};

const compensationHandoff: ApprovedCompensationHandoff = {
	organizationId: "org-1",
	employeeId: compensation.employeeId,
	activeCompensation: compensation,
	activeBenefitEnrollments: [benefitEnrollment],
};

const assignment: WorkAssignment = {
	id: "assignment-1" as WorkAssignment["id"],
	organizationId: "org-1",
	employmentId: compensation.employmentId,
	employeeId: compensation.employeeId,
	positionId: "position-1" as WorkAssignment["positionId"],
	organizationDimensions: null,
	predecessorAssignmentId: null,
	successorAssignmentId: null,
	transferMovementId: null,
	managerEmployeeIdSnapshot: null,
	workCalendarIdSnapshot: null,
	startsOn: "2025-01-01",
	endsOn: null,
	version: 1,
	createdBy: "actor-1",
	updatedBy: "actor-1",
	createdAt: new Date("2025-01-01T00:00:00.000Z"),
	updatedAt: new Date("2025-01-01T00:00:00.000Z"),
};

const leaveHandoff: ApprovedLeaveHandoff = {
	organizationId: "org-1",
	employeeId: compensation.employeeId,
	employmentId: compensation.employmentId,
	requestId: "leave-req-1" as ApprovedLeaveHandoff["requestId"],
	policyId: "policy-1" as ApprovedLeaveHandoff["policyId"],
	policyVersion: 3,
	paid: true,
	unit: "days",
	startDate: "2025-01-10",
	endDate: "2025-01-10",
	quantity: "1",
	segments: [{ date: "2025-01-10", quantity: "1", dayPortion: "full_day" }],
	approvedAt: "2025-01-09T12:00:00.000Z",
	correlationId: "corr-leave",
};

const timeHandoff: ApprovedTimeHandoff = {
	organizationId: "org-1",
	employeeId: compensation.employeeId,
	employmentId: compensation.employmentId,
	periodStart: "2025-01-01",
	periodEnd: "2025-01-31",
	regularMinutes: 9600,
	overtime: [
		{ type: "weekday_overtime", minutes: 120, payrollApprovedMinutes: 90 },
	],
	publicHolidayMinutes: 0,
	restDayMinutes: 0,
	nightMinutes: 0,
	unpaidMinutes: 0,
	paidLeaveMinutes: 480,
	unpaidLeaveMinutes: 0,
	timesheetId: "timesheet-1" as ApprovedTimeHandoff["timesheetId"],
	timesheetVersion: 4,
	approvedAt: "2025-01-31T18:00:00.000Z",
	approvalReference: "approval-ref-1",
};

describe("mapApprovedPayrollHandoff", () => {
	it("maps domain handoffs into the shared contract with all Slice 8.7 fields", () => {
		const mapped = mapApprovedPayrollHandoff({
			compensationHandoff,
			leaveHandoffs: [leaveHandoff],
			timeHandoff,
			assignment,
			assignmentContext: {
				employmentId: compensation.employmentId,
				employeeId: compensation.employeeId,
				departmentId: "dept-1",
				locationKey: "hq",
				legalEntityKey: "le-1",
			},
			effectiveDate: "2025-01-01",
			correlationId: "corr-handoff",
		});

		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;

		const contract = approvedPayrollHandoffSchema.safeParse(mapped.data);
		expect(contract.success).toBe(true);
		if (!contract.success) return;

		expect(mapped.data.organizationId).toBe("org-1");
		expect(mapped.data.employeeId).toBe(compensation.employeeId);
		expect(mapped.data.employmentId).toBe(compensation.employmentId);
		expect(mapped.data.assignment.assignmentId).toBe(assignment.id);
		expect(mapped.data.effectiveDate).toBe("2025-01-01");
		expect(mapped.data.currencyCode).toBe("USD");
		expect(mapped.data.baseAmount).toBe("85000.00");
		expect(mapped.data.decimalScale).toBe(2);
		expect(mapped.data.roundingMode).toBe("half_even");
		expect(mapped.data.payFrequency).toBe("monthly");
		expect(mapped.data.components).toHaveLength(3);
		expect(mapped.data.leaveFacts).toHaveLength(1);
		expect(mapped.data.timeFacts?.timesheetId).toBe(timeHandoff.timesheetId);
		expect(mapped.data.overtimeFacts).toHaveLength(1);
		expect(mapped.data.overtimeFacts[0]?.payrollApprovedMinutes).toBe(90);
		expect(mapped.data.sourceVersion.compensationVersion).toBe(2);
		expect(mapped.data.sourceVersion.leavePolicyVersion).toBe(3);
		expect(mapped.data.sourceVersion.timesheetVersion).toBe(4);
		expect(mapped.data.approvalEvidence.correlationId).toBe("corr-handoff");
	});

	it("does not import @afenda/payroll from handoff modules", () => {
		const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
		const modules = [
			"src/handoff/map-approved-payroll-handoff.ts",
			"src/handoff/approved-payroll-handoff.ts",
			"src/handoff/ports.ts",
		];

		for (const relativePath of modules) {
			const body = readFileSync(join(root, relativePath), "utf8");
			expect(body).not.toMatch(/@afenda\/payroll/);
		}
	});
});
