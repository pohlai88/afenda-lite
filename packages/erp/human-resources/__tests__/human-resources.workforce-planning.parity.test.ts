/**
 * Memory vs Drizzle parity for workforce planning invariants (HR-WFP-01).
 */

import { afterAll, describe, expect, it } from "vitest";
import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { HUMAN_RESOURCES_ERROR_INVALID_INPUT } from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import { cancelRequisition } from "../src/recruitment/requisition";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	getWorkforcePlanVariance,
	submitHeadcountPlan,
} from "../src/workforce-planning/headcount-plan";
import { addHeadcountPlanLine } from "../src/workforce-planning/headcount-plan-line";
import {
	getHeadcountAvailability,
	listHeadcountReservations,
	reserveHeadcount,
} from "../src/workforce-planning/headcount-reservation";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { seedRequisitionPipeline } from "./helpers/recruitment-requisition-fixture";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function approvePlanWithLine(
	ready: ReturnType<typeof createHrParityHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const plan = await createHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-plan-${input.suffix}`,
			idempotencyKey: `idem-plan-${input.suffix}`,
			code: `WFP-${input.suffix}`.slice(0, 64),
			title: "Parity plan",
			planningScopeKey: `scope-${input.suffix}`,
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
		},
		ready,
	);
	if (!plan.ok) {
		return plan;
	}

	const seeded = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `corr-seed-${input.suffix}`,
	});
	if (!seeded) {
		return { ok: false as const, error: { code: "INTERNAL_ERROR" as const } };
	}

	const line = await addHeadcountPlanLine(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-line-${input.suffix}`,
			planId: plan.data.id,
			departmentId: seeded.departmentId,
			jobId: seeded.jobId,
			plannedFte: "1.0000",
			plannedHeadcount: 1,
		},
		ready,
	);
	if (!line.ok) {
		return line;
	}

	let currentPlan = plan.data;
	const submitted = await submitHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-submit-${input.suffix}`,
			planId: currentPlan.id,
			expectedVersion: currentPlan.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}
	currentPlan = submitted.data;

	const approved = await approveHeadcountPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-approve-${input.suffix}`,
			planId: currentPlan.id,
			expectedVersion: currentPlan.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return { ok: true as const, data: { plan: approved.data, line: line.data } };
}

function defineWorkforcePlanningParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-wfp-parity-${suffix}`);
	const ACTOR = `user-hr-wfp-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("reserves headcount against approved plan and releases on cancel", async () => {
		const ready = createHrParityHarness(adapter);
		const approved = await approvePlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: suffix,
			targetStatus: "open",
			title: "Parity hire",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-res-${suffix}`,
				idempotencyKey: `idem-res-${suffix}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) return;

		const availabilityAfterReserve = await getHeadcountAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-avail-1-${suffix}`,
				planLineId: approved.data.line.id,
			},
			ready,
		);
		expect(availabilityAfterReserve.ok).toBe(true);
		if (availabilityAfterReserve.ok) {
			expect(availabilityAfterReserve.data.lines[0]?.availableHeadcount).toBe(
				0,
			);
		}

		const cancelled = await cancelRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cancel-${suffix}`,
				requisitionId: requisition.data.id,
				expectedVersion: requisition.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);

		const listed = await listHeadcountReservations(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-${suffix}`,
				requisitionId: requisition.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data.reservations[0]?.status).toBe("released");
		}

		const availabilityAfterRelease = await getHeadcountAvailability(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-avail-2-${suffix}`,
				planLineId: approved.data.line.id,
			},
			ready,
		);
		expect(availabilityAfterRelease.ok).toBe(true);
		if (availabilityAfterRelease.ok) {
			expect(availabilityAfterRelease.data.lines[0]?.availableHeadcount).toBe(
				1,
			);
		}
	});

	it("rejects over-reservation consistently", async () => {
		const ready = createHrParityHarness(adapter);
		const approved = await approvePlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `over-${suffix}`,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const requisition = await seedRequisitionPipeline(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: `over-${suffix}`,
			targetStatus: "open",
			title: "Parity hire",
		});
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) return;

		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-over-${suffix}`,
				idempotencyKey: `idem-over-${suffix}`,
				planLineId: approved.data.line.id,
				requisitionId: requisition.data.id,
				reservedFte: "2.0000",
				reservedHeadcount: 2,
			},
			ready,
		);
		expect(reserved.ok).toBe(false);
		if (!reserved.ok) {
			expect(humanResourcesCodeFromResult(reserved)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});

	it("computes employment-backed workforce variance", async () => {
		const ready = createHrParityHarness(adapter);
		const approved = await approvePlanWithLine(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `variance-${suffix}`,
		});
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-employee-${suffix}`,
				idempotencyKey: `idem-variance-employee-${suffix}`,
				employeeNumber: `VAR-${suffix}`.slice(0, 64),
				legalName: "Variance Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;
		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-position-${suffix}`,
				code: `VP-${suffix}`.slice(0, 64),
				title: "Variance Position",
				departmentId: approved.data.line.departmentId,
				jobId: approved.data.line.jobId,
				status: "active",
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;
		const assignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-assignment-${suffix}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				legalEntityKey: "legal-a",
				businessUnitKey: "business-a",
				locationKey: "hq",
				costCentreKey: "cost-a",
				projectKey: "project-a",
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

		const variance = await getWorkforcePlanVariance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-variance-${suffix}`,
				planId: approved.data.plan.id,
				asOf: "2026-07-01",
			},
			ready,
		);
		expect(variance.ok).toBe(true);
		if (!variance.ok) return;
		expect(variance.data.lines[0]).toMatchObject({
			actualHeadcount: 1,
			actualFte: "1.0000",
			varianceHeadcount: 0,
			varianceFte: "0.0000",
			availableHeadcount: 1,
		});
	});
}

describe("@afenda/human-resources workforce planning parity (memory)", () => {
	defineWorkforcePlanningParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)(
	"@afenda/human-resources workforce planning parity (drizzle)",
	() => {
		defineWorkforcePlanningParitySuite("drizzle");
	},
);
