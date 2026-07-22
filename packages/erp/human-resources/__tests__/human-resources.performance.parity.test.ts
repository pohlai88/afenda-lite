/**
 * Memory vs Drizzle parity for performance management (HR-PERF-01).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	approvePerformanceGoal,
	createPerformanceGoal,
	getPerformanceGoalById,
	listEmployeeGoals,
	submitPerformanceGoal,
} from "../src/performance/goal";
import {
	addCycleParticipant,
	createPerformanceCycle,
	getPerformanceCycleById,
	listCycleParticipants,
	listPerformanceCycles,
	openPerformanceCycle,
} from "../src/performance/performance-cycle";
import {
	acknowledgeImprovementPlan,
	createImprovementPlan,
	openImprovementPlan,
	recordImprovementCheckpoint,
} from "../src/performance/improvement-plan";
import {
	finalizePerformanceReview,
	getPerformanceReviewById,
	startPerformanceReview,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../src/performance/review";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { ensurePerformanceSchemaForTests } from "./helpers/ensure-performance-schema";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

const RATING_SCALE = { codes: ["meets", "exceeds"] } as const;

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployeeEmployment(
	ready: ReturnType<typeof createWorkforceHarness>,
	input: { organizationId: string; actorUserId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-emp-${input.suffix}`,
			idempotencyKey: `idem-emp-${input.suffix}`,
			employeeNumber: `E-${input.suffix}`,
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	if (!employee.ok) {
		throw new Error(`Failed to seed employee: ${employee.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	if (!employment.ok) {
		throw new Error(`Failed to seed employment: ${employment.code}`);
	}
	return { employee: employee.data, employment: employment.data };
}

function definePerformanceParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-perf-parity-${suffix}`;
	const ACTOR = `user-hr-perf-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("cycle lifecycle with participant enrollment", async () => {
		const ready = createWorkforceHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `cycle-${suffix}`,
		});

		const created = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cycle-${suffix}`,
				idempotencyKey: `idem-cycle-${suffix}`,
				code: `FY-PARITY-${suffix}`,
				name: "Parity Cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;
		expect(created.data.status).toBe("draft");

		const retrieved = await getPerformanceCycleById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-cycle-${suffix}`,
				cycleId: created.data.id,
			},
			ready,
		);
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
		expect(retrieved.data?.code).toBe(`FY-PARITY-${suffix}`);

		const opened = await openPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-open-cycle-${suffix}`,
				cycleId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;
		expect(opened.data.status).toBe("open");

		const participant = await addCycleParticipant(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-part-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			ready,
		);
		expect(participant.ok).toBe(true);
		if (!participant.ok) return;

		const participants = await listCycleParticipants(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-parts-${suffix}`,
				cycleId: opened.data.id,
			},
			ready,
		);
		expect(participants.ok).toBe(true);
		if (!participants.ok) return;
		expect(participants.data).toHaveLength(1);

		const cycles = await listPerformanceCycles(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-cycles-${suffix}`,
				status: "open",
			},
			ready,
		);
		expect(cycles.ok).toBe(true);
		if (!cycles.ok) return;
		expect(cycles.data.cycles.some((cycle) => cycle.id === opened.data.id)).toBe(
			true,
		);
	});

	it("goal submit and approve workflow", async () => {
		const ready = createWorkforceHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `goal-${suffix}`,
		});

		const cycle = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-cycle-${suffix}`,
				idempotencyKey: `idem-goal-cycle-${suffix}`,
				code: `GOAL-CYCLE-${suffix}`,
				name: "Goal Cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "percent100",
			},
			ready,
		);
		if (!cycle.ok) throw new Error(cycle.code);

		const opened = await openPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-open-${suffix}`,
				cycleId: cycle.data.id,
				expectedVersion: cycle.data.version,
			},
			ready,
		);
		if (!opened.ok) throw new Error(opened.code);

		await addCycleParticipant(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-part-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			ready,
		);

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-${suffix}`,
				idempotencyKey: `idem-goal-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				title: "Parity Goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok).toBe(true);
		if (!goal.ok) return;

		const submitted = await submitPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-submit-${suffix}`,
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const approved = await approvePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-approve-${suffix}`,
				goalId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("approved");

		const retrieved = await getPerformanceGoalById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-goal-${suffix}`,
				goalId: approved.data.id,
			},
			ready,
		);
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
		expect(retrieved.data?.status).toBe("approved");

		const page = await listEmployeeGoals(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-goals-${suffix}`,
				employeeId: worker.employee.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.goals).toHaveLength(1);
	});

	it("review workflow through finalize and PIP checkpoint", async () => {
		const ready = createWorkforceHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `review-emp-${suffix}`,
		});
		const manager = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `review-mgr-${suffix}`,
		});

		const cycle = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-cycle-${suffix}`,
				idempotencyKey: `idem-review-cycle-${suffix}`,
				code: `REVIEW-CYCLE-${suffix}`,
				name: "Review Cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		if (!cycle.ok) throw new Error(cycle.code);

		const opened = await openPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-open-${suffix}`,
				cycleId: cycle.data.id,
				expectedVersion: cycle.data.version,
			},
			ready,
		);
		if (!opened.ok) throw new Error(opened.code);

		await addCycleParticipant(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-part-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			ready,
		);

		const review = await startPerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-start-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok).toBe(true);
		if (!review.ok) return;

		const self = await submitSelfAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-self-${suffix}`,
				reviewId: review.data.id,
				rating: "meets",
				actorEmployeeId: worker.employee.id,
				expectedVersion: review.data.version,
			},
			ready,
		);
		expect(self.ok).toBe(true);
		if (!self.ok) return;

		const managerAssessment = await submitManagerAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-mgr-${suffix}`,
				reviewId: self.data.id,
				rating: "exceeds",
				managerEmployeeId: manager.employee.id,
				expectedVersion: self.data.version,
			},
			ready,
		);
		expect(managerAssessment.ok).toBe(true);
		if (!managerAssessment.ok) return;

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-finalize-${suffix}`,
				reviewId: managerAssessment.data.id,
				overallRating: "meets",
				idempotencyKey: `idem-review-finalize-${suffix}`,
				expectedVersion: managerAssessment.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;
		expect(finalized.data.status).toBe("finalized");

		const retrieved = await getPerformanceReviewById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-review-${suffix}`,
				reviewId: finalized.data.id,
				includeConfidential: false,
			},
			ready,
		);
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
		expect(retrieved.data?.review.status).toBe("finalized");

		const plan = await createImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip-${suffix}`,
				idempotencyKey: `idem-pip-${suffix}`,
				reviewId: finalized.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				performanceGap: "Below expectations",
				expectedOutcome: "Meet baseline",
				measurableActions: "Weekly 1:1",
				supportResources: "Mentor",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const openedPlan = await openImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip-open-${suffix}`,
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			ready,
		);
		expect(openedPlan.ok).toBe(true);
		if (!openedPlan.ok) return;

		const checkpoint = await recordImprovementCheckpoint(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip-checkpoint-${suffix}`,
				planId: openedPlan.data.id,
				sequenceNumber: 1,
				outcome: "met",
				notes: "Parity checkpoint",
			},
			ready,
		);
		expect(checkpoint.ok).toBe(true);

		const acknowledged = await acknowledgeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip-ack-${suffix}`,
				planId: openedPlan.data.id,
				expectedVersion: openedPlan.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
	});
}

describe("Performance parity [memory]", () => {
	definePerformanceParitySuite("memory");
});

describe.skipIf(!hasDatabase)("Performance parity [drizzle]", () => {
	beforeAll(async () => {
		await ensurePerformanceSchemaForTests();
	});
	definePerformanceParitySuite("drizzle");
});
