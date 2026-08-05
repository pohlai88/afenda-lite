import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { approvedPayrollHandoffSchema } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { mapApprovedPayrollHandoff } from "../src/features/payroll-handoff/map-approved-payroll-handoff";
import { STATUTORY_RELIEF_DECLARATION_VERSION } from "../src/features/statutory-profile/status";
import type {
	ApprovedCompensationHandoff,
	ApprovedLeaveHandoff,
	ApprovedTimeHandoff,
	BenefitEnrollment,
	EmployeeCompensation,
	PriorEmployerYtd,
	StatutoryProfile,
	WorkAssignment,
} from "../src/kernel/contracts";

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
			employmentStatus: "active",
			compensationHandoff,
			leaveBalanceAtTermination: null,
			leaveHandoffs: [leaveHandoff],
			priorEmployerYtd: [],
			statutoryProfile: null,
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
		if (!mapped.ok) {
			return;
		}

		const contract = approvedPayrollHandoffSchema.safeParse(mapped.data);
		expect(contract.success).toBe(true);
		if (!contract.success) {
			return;
		}

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
		expect(mapped.data.leaveBalanceAtTermination).toBeNull();
		expect(mapped.data.priorEmployerYtd).toEqual([]);
		expect(mapped.data.statutoryProfile).toBeNull();
		expect(mapped.data.timeFacts?.timesheetId).toBe(timeHandoff.timesheetId);
		expect(mapped.data.overtimeFacts).toHaveLength(1);
		expect(mapped.data.overtimeFacts[0]?.payrollApprovedMinutes).toBe(90);
		expect(mapped.data.sourceVersion.compensationVersion).toBe(2);
		expect(mapped.data.sourceVersion.leavePolicyVersion).toBe(3);
		expect(mapped.data.sourceVersion.timesheetVersion).toBe(4);
		expect(mapped.data.approvalEvidence.correlationId).toBe("corr-handoff");
	});

	it("maps statutory profile, prior-employer YTD, and termination leave balance", () => {
		const statutoryProfile = {
			createdAt: new Date("2025-01-01T00:00:00.000Z"),
			createdBy: "actor-1",
			createIdempotencyKey: "idem-stat",
			createRequestFingerprint: "fp-stat",
			dependantCount: 1,
			effectiveFrom: "2025-01-01",
			effectiveTo: null,
			employeeId: compensation.employeeId,
			employeeProvidentFundNumber: "EPF-1",
			expatriate: false,
			id: "stat-1" as StatutoryProfile["id"],
			jurisdictionCode: "MY",
			minimumWageZone: null,
			nationalityCountryCode: "MY",
			organizationId: "org-1",
			reliefDeclarationVersion: STATUTORY_RELIEF_DECLARATION_VERSION,
			reliefDeclarations: [
				{
					amount: "100.00",
					currencyCode: "MYR",
					dependantReference: null,
					evidenceRef: null,
					reliefCode: "spouse",
				},
			],
			socialInsuranceBookNumber: null,
			socialSecurityNumber: null,
			status: "active",
			supersedesStatutoryProfileId: null,
			taxFileNumber: "TFN-1",
			taxResidencyStatus: "resident",
			updatedAt: new Date("2025-01-01T00:00:00.000Z"),
			updatedBy: "actor-1",
			version: 3,
		} satisfies StatutoryProfile;
		const priorEmployerYtd = {
			createdAt: new Date("2025-01-02T00:00:00.000Z"),
			createdBy: "actor-1",
			createIdempotencyKey: "idem-ytd",
			createRequestFingerprint: "fp-ytd",
			currencyCode: "MYR",
			employeeId: compensation.employeeId,
			grossAmount: "12000.00",
			id: "ytd-1" as PriorEmployerYtd["id"],
			jurisdictionCode: "MY",
			organizationId: "org-1",
			priorEmployerName: "Prior Co",
			recordedOn: "2025-01-02",
			statutoryContributionAmount: "400.00",
			taxWithheldAmount: "800.00",
			taxYear: 2025,
			updatedAt: new Date("2025-01-02T00:00:00.000Z"),
			updatedBy: "actor-1",
			version: 1,
		} satisfies PriorEmployerYtd;

		const mapped = mapApprovedPayrollHandoff({
			assignment,
			compensationHandoff,
			correlationId: "corr-handoff",
			effectiveDate: "2025-03-15",
			employmentStatus: "terminated",
			leaveBalanceAtTermination: { asOf: "2025-03-15", days: "4.5" },
			leaveHandoffs: [],
			priorEmployerYtd: [priorEmployerYtd],
			statutoryProfile,
			timeHandoff: null,
		});

		expect(mapped.ok).toBe(true);
		if (!mapped.ok) {
			return;
		}
		expect(mapped.data.leaveBalanceAtTermination).toEqual({
			asOf: "2025-03-15",
			days: "4.5",
		});
		expect(mapped.data.priorEmployerYtd).toEqual([
			{
				currencyCode: "MYR",
				grossAmount: "12000.00",
				jurisdictionCode: "MY",
				priorEmployerName: "Prior Co",
				recordedOn: "2025-01-02",
				statutoryContributionAmount: "400.00",
				taxWithheldAmount: "800.00",
				taxYear: 2025,
			},
		]);
		expect(mapped.data.statutoryProfile?.profileId).toBe("stat-1");
		expect(mapped.data.statutoryProfile?.jurisdictionCode).toBe("MY");
		expect(mapped.data.sourceVersion.statutoryProfileVersion).toBe(3);
	});

	it("does not import @afenda/payroll from handoff modules", () => {
		const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
		const modules = [
			"src/features/payroll-handoff/map-approved-payroll-handoff.ts",
			"src/features/payroll-handoff/approved-payroll-handoff.ts",
		];

		for (const relativePath of modules) {
			const body = readFileSync(join(root, relativePath), "utf8");
			expect(body).not.toMatch(/@afenda\/payroll/);
		}
	});
});
