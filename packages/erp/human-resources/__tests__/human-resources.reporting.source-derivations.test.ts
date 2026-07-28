import {
	countActiveReportingGoals,
	deriveLearningDates,
	deriveWorkforceActuals,
	selectLatestSuccessionReadiness,
} from "@afenda/human-resources";
import { describe, expect, it } from "vitest";

describe("Human Resources reporting source derivations", () => {
	it("derives learning completion and certification expiry from source rows", () => {
		expect(
			deriveLearningDates({
				assignmentId: "assignment-1",
				completions: [
					{
						id: "completion-1",
						assignmentId: "assignment-1",
						completedAt: new Date("2026-07-15T00:00:00.000Z"),
					},
				],
				certifications: [
					{ completionId: "completion-1", expiresOn: "2027-07-15" },
				],
			}),
		).toEqual({
			completedOn: "2026-07-15",
			certificationExpiresOn: "2027-07-15",
		});
	});

	it("counts active goals instead of returning a constant", () => {
		expect(
			countActiveReportingGoals("employee-1", [
				{ employeeId: "employee-1", status: "active" },
				{ employeeId: "employee-1", status: "closed" },
				{ employeeId: "employee-2", status: "active" },
			]),
		).toBe(1);
	});

	it("uses the freshest succession readiness evidence", () => {
		expect(
			selectLatestSuccessionReadiness([
				{ readiness: "ready_now", readinessEffectiveOn: "2026-01-01" },
				{ readiness: "ready_soon", readinessEffectiveOn: "2026-07-01" },
			]),
		).toEqual({
			readiness: "ready_soon",
			readinessEffectiveOn: "2026-07-01",
		});
	});

	it("derives actual headcount and FTE from effective assignments", () => {
		const actuals = deriveWorkforceActuals({
			asOf: "2026-07-31",
			line: { positionId: "position-1", departmentId: "department-1" },
			assignments: [
				{
					employeeId: "employee-1",
					positionId: "position-1",
					departmentId: "department-1",
					assignmentStartsOn: "2026-01-01",
					assignmentEndsOn: null,
					employmentStartsOn: "2026-01-01",
					employmentEndsOn: null,
				},
				{
					employeeId: "employee-2",
					positionId: "position-other",
					departmentId: "department-1",
					assignmentStartsOn: "2026-01-01",
					assignmentEndsOn: null,
					employmentStartsOn: "2026-01-01",
					employmentEndsOn: null,
				},
			],
		});

		expect(actuals).toEqual({
			actualHeadcount: 1,
			actualFullTimeEquivalent: "1.0000",
		});
	});
});
