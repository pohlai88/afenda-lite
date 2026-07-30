import { ok } from "@afenda/errors/result";
import {
	buildHumanResourcesReportingSnapshot,
	type HumanResourcesReadModelFact,
	type HumanResourcesReportingFactKind,
	type HumanResourcesReportingSourcePort,
} from "@afenda/human-resources";
import { describe, expect, it, vi } from "vitest";

const ORGANIZATION_ID = "org-reporting";

function createSource(
	sourceFacts: readonly HumanResourcesReadModelFact[],
): HumanResourcesReportingSourcePort {
	return {
		listFacts: vi.fn(async (input) => {
			const matching = sourceFacts.filter(
				(fact) =>
					fact.kind === input.kind &&
					fact.organizationId === input.organizationId,
			);
			const offset = (input.page - 1) * input.pageSize;
			return await ok({
				entries: matching.slice(offset, offset + input.pageSize),
				total: matching.length,
				page: input.page,
				pageSize: input.pageSize,
			});
		}),
	};
}

const facts = [
	{
		id: "employment-1",
		kind: "employment",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		startedOn: "2025-01-01",
		endedOn: null,
		fullTimeEquivalent: "1.0000",
	},
	{
		id: "employment-2",
		kind: "employment",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-2",
		startedOn: "2025-01-01",
		endedOn: "2026-07-15",
		fullTimeEquivalent: "0.5000",
	},
	...(
		[
			"requisition_opened",
			"application_received",
			"offer_accepted",
			"hired",
		] as const
	).map((stage, index) => ({
		id: `recruitment-${index}`,
		kind: "recruitment" as const,
		organizationId: ORGANIZATION_ID,
		requisitionId: "requisition-1",
		applicationId: stage === "requisition_opened" ? null : "application-1",
		stage,
		occurredOn: `2026-07-${String(index + 2).padStart(2, "0")}`,
	})),
	{
		id: "leave-1",
		kind: "leave",
		organizationId: ORGANIZATION_ID,
		requestId: "leave-request-1",
		status: "approved",
		quantityMinutes: 480,
		occurredOn: "2026-07-10",
	},
	{
		id: "attendance-1",
		kind: "attendance",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		workDate: "2026-07-10",
		scheduledMinutes: 480,
		workedMinutes: 450,
		exceptionCount: 1,
	},
	{
		id: "overtime-1",
		kind: "overtime",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		workDate: "2026-07-10",
		status: "verified",
		requestedMinutes: 90,
		approvedMinutes: 60,
		workedMinutes: 65,
		payrollApprovedMinutes: 60,
	},
	{
		id: "compensation-1",
		kind: "compensation",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		currencyCode: "MYR",
		annualizedAmount: "100000.50",
	},
	{
		id: "compensation-2",
		kind: "compensation",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		effectiveFrom: "2026-07-01",
		effectiveTo: null,
		currencyCode: "MYR",
		annualizedAmount: "20000.25",
	},
	{
		id: "compliance-old",
		kind: "compliance",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		assessedOn: "2026-06-30",
		status: "at_risk",
		outstandingRequirementCount: 2,
	},
	{
		id: "compliance-current",
		kind: "compliance",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		assessedOn: "2026-07-20",
		status: "compliant",
		outstandingRequirementCount: 0,
	},
	{
		id: "learning-1",
		kind: "learning",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		assignedOn: "2026-06-01",
		dueOn: "2026-07-15",
		completedOn: null,
		certificationExpiresOn: null,
	},
	{
		id: "performance-1",
		kind: "performance",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-1",
		reviewPeriodEnd: "2026-07-20",
		status: "completed",
		rating: "4.5000",
		activeGoalCount: 2,
	},
	{
		id: "performance-2",
		kind: "performance",
		organizationId: ORGANIZATION_ID,
		employeeId: "employee-2",
		reviewPeriodEnd: "2026-07-20",
		status: "completed",
		rating: "3.5000",
		activeGoalCount: 1,
	},
	{
		id: "succession-1",
		kind: "succession",
		organizationId: ORGANIZATION_ID,
		positionId: "position-1",
		assessedOn: "2026-07-20",
		isCriticalRole: true,
		hasActivePlan: true,
		readiness: "ready_now",
	},
	{
		id: "plan-1",
		kind: "workforce_plan",
		organizationId: ORGANIZATION_ID,
		planLineId: "plan-line-1",
		asOf: "2026-07-31",
		plannedHeadcount: 3,
		actualHeadcount: 2,
		plannedFullTimeEquivalent: "3.0000",
		actualFullTimeEquivalent: "2.5000",
	},
] satisfies HumanResourcesReadModelFact[];

describe("Human Resources reporting reconciliation", () => {
	it("builds all twelve tenant-scoped projections with explicit as-of semantics", async () => {
		const result = await buildHumanResourcesReportingSnapshot(
			{
				organizationId: ORGANIZATION_ID,
				asOf: "2026-07-31",
				periodStart: "2026-07-01",
				periodEnd: "2026-07-31",
			},
			createSource(facts),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.workforceHeadcount).toEqual({
			headcount: 1,
			fullTimeEquivalent: "1",
		});
		expect(result.data.turnover).toEqual({
			openingHeadcount: 2,
			closingHeadcount: 1,
			terminations: 1,
			averageHeadcount: "1.5000",
			turnoverRatePercent: "66.6666",
		});
		expect(result.data.hiring).toEqual({
			requisitionsOpened: 1,
			applicationsReceived: 1,
			offersAccepted: 1,
			hires: 1,
		});
		expect(result.data.leave).toEqual({
			requested: 0,
			approved: 1,
			rejected: 0,
			cancelled: 0,
			approvedMinutes: 480,
		});
		expect(result.data.attendance).toEqual({
			scheduledMinutes: 480,
			workedMinutes: 450,
			exceptionCount: 1,
			attendanceRatePercent: "93.7500",
		});
		expect(result.data.overtime).toEqual({
			requestedMinutes: 90,
			approvedMinutes: 60,
			workedMinutes: 65,
			payrollApprovedMinutes: 60,
		});
		expect(result.data.compensation).toEqual({
			activeEmployees: 1,
			annualizedByCurrency: { MYR: "120000.75" },
		});
		expect(result.data.compliance).toEqual({
			compliant: 1,
			atRisk: 0,
			nonCompliant: 0,
			outstandingRequirements: 0,
		});
		expect(result.data.learning).toEqual({
			assigned: 1,
			completed: 0,
			overdue: 1,
			certificationsExpiring: 0,
		});
		expect(result.data.performance).toEqual({
			participants: 2,
			completedReviews: 2,
			activeGoals: 3,
			averageRating: "4",
		});
		expect(result.data.succession).toEqual({
			criticalRoles: 1,
			rolesWithActivePlan: 1,
			readyNowCandidates: 1,
			coverageRatePercent: "100.0000",
		});
		expect(result.data.workforcePlanVariance).toEqual({
			plannedHeadcount: 3,
			actualHeadcount: 2,
			varianceHeadcount: 1,
			plannedFullTimeEquivalent: "3",
			actualFullTimeEquivalent: "2.5",
			varianceFullTimeEquivalent: "0.5",
		});
	});

	it("fails closed when a reporting page crosses the tenant boundary", async () => {
		const source: HumanResourcesReportingSourcePort = {
			listFacts: async (input) =>
				ok({
					entries:
						input.kind === "employment"
							? [
									{
										...facts[0],
										organizationId: "org-other",
									},
								]
							: [],
					total: input.kind === "employment" ? 1 : 0,
					page: input.page,
					pageSize: input.pageSize,
				}),
		};

		const result = await buildHumanResourcesReportingSnapshot(
			{
				organizationId: ORGANIZATION_ID,
				asOf: "2026-07-31",
				periodStart: "2026-07-01",
				periodEnd: "2026-07-31",
			},
			source,
		);

		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Reporting source crossed a tenant or fact boundary",
		});
	});

	it("reconciles paginated fact sources without dropping rows", async () => {
		const employmentFacts: HumanResourcesReadModelFact[] = Array.from(
			{ length: 101 },
			(_, index) => ({
				id: `employment-page-${index}`,
				kind: "employment",
				organizationId: ORGANIZATION_ID,
				employeeId: `employee-page-${index}`,
				startedOn: "2026-01-01",
				endedOn: null,
				fullTimeEquivalent: "1.0000",
			}),
		);
		const source = createSource(employmentFacts);
		const result = await buildHumanResourcesReportingSnapshot(
			{
				organizationId: ORGANIZATION_ID,
				asOf: "2026-07-31",
				periodStart: "2026-07-01",
				periodEnd: "2026-07-31",
			},
			source,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.workforceHeadcount.headcount).toBe(101);
		expect(source.listFacts).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "employment" satisfies HumanResourcesReportingFactKind,
				page: 2,
			}),
		);
	});
});
