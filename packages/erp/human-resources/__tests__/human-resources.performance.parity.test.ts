/**
 * Memory vs Drizzle parity for performance management (HR-PERF-01).
 */

import { and, db, eq, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	activatePerformanceGoal,
	approvePerformanceGoal,
	closePerformanceGoal,
	createPerformanceGoal,
	getPerformanceGoalById,
	listEmployeeGoals,
	listGoalProgress,
	recordGoalProgress,
	submitPerformanceGoal,
} from "../src/performance/goal";
import {
	acknowledgeImprovementPlan,
	amendImprovementPlan,
	closeImprovementPlanUnsuccessful,
	completeImprovementPlan,
	createImprovementPlan,
	listActiveImprovementPlans,
	listImprovementPlanCheckpoints,
	openImprovementPlan,
	recordImprovementCheckpoint,
} from "../src/performance/improvement-plan";
import {
	createPerformanceCycle,
	getPerformanceCycleById,
	listCycleParticipants,
	listPerformanceCycles,
} from "../src/performance/performance-cycle";
import {
	acknowledgePerformanceReview,
	addDelegatedReviewer,
	calibratePerformanceReview,
	finalizePerformanceReview,
	getEmployeePerformanceHistory,
	getPerformanceReviewById,
	startPerformanceReview,
	submitDelegatedAssessment,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../src/performance/review";
import { runSequential } from "../src/shared/run-sequential";
import { runDrizzleParity } from "./helpers/database-gate";
import { ensurePerformanceSchemaForTests } from "./helpers/ensure-performance-schema";
import { helperAssert as assert } from "./helpers/helper-assert";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { mapActorToEmployee } from "./helpers/identity-resolver";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { publishAndOpenPerformanceCycle } from "./helpers/performance-cycle-harness";

const RATING_SCALE = { codes: ["meets", "exceeds"] } as const;

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resultMessage(result: {
	ok: boolean;
	code?: string;
	message?: string;
	details?: unknown;
}): string {
	if (result.ok) {
		return "result ok";
	}
	const details =
		result.details === undefined ? "" : ` ${JSON.stringify(result.details)}`;
	return `${result.code ?? "UNKNOWN"} ${result.message ?? ""}${details}`.trim();
}

async function seedEmployeeEmployment(
	ready: ReturnType<typeof createHrParityHarness>,
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
	const mapped = await mapActorToEmployee(ready.store, {
		organizationId: input.organizationId,
		userId: input.actorUserId,
		employeeId: employee.data.id,
		actorUserId: input.actorUserId,
		effectiveFrom: "2025-01-01",
	});
	if (!mapped.ok) {
		throw new Error(`Failed to map actor to employee: ${mapped.code}`);
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
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-perf-parity-${suffix}`);
	const ACTOR = `user-hr-perf-parity-${suffix}`;

	async function expectPipEvent(input: {
		correlationId: string;
		type: string;
		ready: ReturnType<typeof createHrParityHarness>;
	}): Promise<void> {
		if (adapter === "drizzle") {
			const events = await db
				.select({ id: platformDomainEvent.id })
				.from(platformDomainEvent)
				.where(
					and(
						eq(platformDomainEvent.organizationId, ORG),
						eq(platformDomainEvent.type, input.type),
						eq(platformDomainEvent.correlationId, input.correlationId),
					),
				);
			assert.isAbove(events.length, 0);
			return;
		}
		assert.strictEqual(
			input.ready.ports.outbox.calls.some((call) => call.type === input.type),
			true,
		);
	}

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("cycle lifecycle with participant enrollment", async () => {
		const ready = createHrParityHarness(adapter);
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
		if (!created.ok) {
			return;
		}
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
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data?.code).toBe(`FY-PARITY-${suffix}`);

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-open-cycle-${suffix}`,
			cycle: created.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) {
			return;
		}
		expect(opened.data.status).toBe("open");

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
		if (!participants.ok) {
			return;
		}
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
		if (!cycles.ok) {
			return;
		}
		expect(
			cycles.data.cycles.some((cycle) => cycle.id === opened.data.id),
		).toBe(true);
	});

	it("goal submit and approve workflow", async () => {
		const ready = createHrParityHarness(adapter);
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
		if (!cycle.ok) {
			throw new Error(cycle.code);
		}

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-goal-open-${suffix}`,
			cycle: cycle.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		if (!opened.ok) {
			throw new Error(opened.code);
		}

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-${suffix}`,
				idempotencyKey: `idem-goal-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				goalKind: "employee",
				title: "Parity Goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok, resultMessage(goal)).toBe(true);
		if (!goal.ok) {
			return;
		}

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
		if (!submitted.ok) {
			return;
		}

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
		if (!approved.ok) {
			return;
		}
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
		if (!retrieved.ok) {
			return;
		}
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
		if (!page.ok) {
			return;
		}
		expect(page.data.goals).toHaveLength(1);
	});

	it("goal lifecycle depth with activate progress and close", async () => {
		const ready = createHrParityHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `goal-depth-${suffix}`,
		});

		const cycle = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-cycle-${suffix}`,
				idempotencyKey: `idem-goal-depth-cycle-${suffix}`,
				code: `GOAL-DEPTH-${suffix}`,
				name: "Goal depth cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "percent100",
			},
			ready,
		);
		if (!cycle.ok) {
			throw new Error(cycle.code);
		}

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-goal-depth-open-${suffix}`,
			cycle: cycle.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		if (!opened.ok) {
			throw new Error(opened.code);
		}

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-${suffix}`,
				idempotencyKey: `idem-goal-depth-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				goalKind: "employee",
				title: "Depth goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok, resultMessage(goal)).toBe(true);
		if (!goal.ok) {
			return;
		}

		const submitted = await submitPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-submit-${suffix}`,
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		const approved = await approvePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-approve-${suffix}`,
				goalId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		const activated = await activatePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-activate-${suffix}`,
				goalId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const progress = await recordGoalProgress(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-progress-${suffix}`,
				goalId: activated.data.id,
				progressNote: "Parity progress",
				progressValue: "40",
				evidenceReference: "doc://parity/1",
			},
			ready,
		);
		expect(progress.ok).toBe(true);
		if (!progress.ok) {
			return;
		}

		const progressPage = await listGoalProgress(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-list-progress-${suffix}`,
				goalId: activated.data.id,
				page: 1,
				pageSize: 5,
			},
			ready,
		);
		expect(progressPage.ok).toBe(true);
		if (!progressPage.ok) {
			return;
		}
		expect(progressPage.data.totalCount).toBe(1);

		const closed = await closePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-goal-depth-close-${suffix}`,
				goalId: activated.data.id,
				expectedVersion: activated.data.version,
				completionNote: "Done",
				completionEvidenceReference: "doc://parity/close",
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) {
			return;
		}
		expect(closed.data.status).toBe("closed");
	});

	it("review workflow through finalize and PIP checkpoint", async () => {
		const ready = createHrParityHarness(adapter);
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
		const delegated = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `review-delegated-${suffix}`,
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
		if (!cycle.ok) {
			throw new Error(cycle.code);
		}

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-review-open-${suffix}`,
			cycle: cycle.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		if (!opened.ok) {
			throw new Error(opened.code);
		}

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
		expect(review.ok, resultMessage(review)).toBe(true);
		if (!review.ok) {
			return;
		}

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
		if (!self.ok) {
			return;
		}

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
		if (!managerAssessment.ok) {
			return;
		}

		const withDelegated = await addDelegatedReviewer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-delegated-add-${suffix}`,
				reviewId: managerAssessment.data.id,
				delegatedEmployeeId: delegated.employee.id,
				expectedVersion: managerAssessment.data.version,
			},
			ready,
		);
		expect(withDelegated.ok).toBe(true);
		if (!withDelegated.ok) {
			return;
		}

		const detail = await getPerformanceReviewById(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-delegated-detail-${suffix}`,
				reviewId: withDelegated.data.id,
				includeConfidential: true,
			},
			ready,
		);
		expect(detail.ok).toBe(true);
		if (!(detail.ok && detail.data)) {
			return;
		}
		const delegatedParticipant = detail.data.participants.find(
			(participant) => participant.role === "delegated",
		);
		expect(delegatedParticipant).toBeDefined();
		if (!delegatedParticipant) {
			return;
		}

		const delegatedSubmit = await submitDelegatedAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-delegated-submit-${suffix}`,
				reviewId: withDelegated.data.id,
				participantId: delegatedParticipant.id,
				rating: "meets",
				commentsSensitive: "Delegated confidential note",
				delegatedEmployeeId: delegated.employee.id,
				expectedVersion: withDelegated.data.version,
			},
			ready,
		);
		expect(delegatedSubmit.ok).toBe(true);
		if (!delegatedSubmit.ok) {
			return;
		}

		const acknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-ack-${suffix}`,
				reviewId: delegatedSubmit.data.id,
				acknowledgementNote: "Acknowledged in parity workflow",
				expectedVersion: delegatedSubmit.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) {
			return;
		}

		const calibrated = await calibratePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-calibrate-${suffix}`,
				reviewId: acknowledged.data.id,
				overallRating: "meets",
				calibrationNote: "Calibration parity note",
				expectedVersion: acknowledged.data.version,
			},
			ready,
		);
		expect(calibrated.ok).toBe(true);
		if (!calibrated.ok) {
			return;
		}

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-finalize-${suffix}`,
				reviewId: calibrated.data.id,
				overallRating: "meets",
				idempotencyKey: `idem-review-finalize-${suffix}`,
				expectedVersion: calibrated.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}
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
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data?.review.status).toBe("finalized");
		expect(retrieved.data?.review.overallRating).toBeNull();
		expect(retrieved.data?.review.calibrationNote).toBeNull();
		expect(
			retrieved.data?.assessments.every(
				(assessment) =>
					assessment.rating === null && assessment.commentsSensitive === null,
			),
		).toBe(true);

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
		expect(plan.ok, resultMessage(plan)).toBe(true);
		if (!plan.ok) {
			return;
		}

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
		if (!openedPlan.ok) {
			return;
		}

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

		const acknowledgedPlan = await acknowledgeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip-ack-${suffix}`,
				planId: openedPlan.data.id,
				expectedVersion: openedPlan.data.version,
			},
			ready,
		);
		expect(acknowledgedPlan.ok).toBe(true);
	});

	it("employee performance history aggregates reviews goals and PIPs", async () => {
		const ready = createHrParityHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `history-emp-${suffix}`,
		});
		const manager = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `history-mgr-${suffix}`,
		});

		const cycle = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-cycle-${suffix}`,
				idempotencyKey: `idem-history-cycle-${suffix}`,
				code: `HISTORY-CYCLE-${suffix}`,
				name: "History Cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "percent100",
			},
			ready,
		);
		if (!cycle.ok) {
			throw new Error(cycle.code);
		}

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-history-open-${suffix}`,
			cycle: cycle.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		if (!opened.ok) {
			throw new Error(opened.code);
		}

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-goal-${suffix}`,
				idempotencyKey: `idem-history-goal-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				goalKind: "employee",
				title: "Parity history goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok, resultMessage(goal)).toBe(true);
		if (!goal.ok) {
			return;
		}

		const submittedGoal = await submitPerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-goal-submit-${suffix}`,
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submittedGoal.ok).toBe(true);
		if (!submittedGoal.ok) {
			return;
		}

		const approvedGoal = await approvePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-goal-approve-${suffix}`,
				goalId: submittedGoal.data.id,
				expectedVersion: submittedGoal.data.version,
			},
			ready,
		);
		expect(approvedGoal.ok).toBe(true);
		if (!approvedGoal.ok) {
			return;
		}

		const review = await startPerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-review-${suffix}`,
				cycleId: opened.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok, resultMessage(review)).toBe(true);
		if (!review.ok) {
			return;
		}

		const self = await submitSelfAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-self-${suffix}`,
				reviewId: review.data.id,
				rating: "meets",
				actorEmployeeId: worker.employee.id,
				expectedVersion: review.data.version,
			},
			ready,
		);
		expect(self.ok).toBe(true);
		if (!self.ok) {
			return;
		}

		const managerAssessment = await submitManagerAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-mgr-${suffix}`,
				reviewId: self.data.id,
				rating: "exceeds",
				managerEmployeeId: manager.employee.id,
				expectedVersion: self.data.version,
			},
			ready,
		);
		expect(managerAssessment.ok).toBe(true);
		if (!managerAssessment.ok) {
			return;
		}

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-finalize-${suffix}`,
				reviewId: managerAssessment.data.id,
				overallRating: "meets",
				idempotencyKey: `idem-history-finalize-${suffix}`,
				expectedVersion: managerAssessment.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}

		const plan = await createImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-pip-${suffix}`,
				idempotencyKey: `idem-history-pip-${suffix}`,
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
		expect(plan.ok, resultMessage(plan)).toBe(true);
		if (!plan.ok) {
			return;
		}

		const history = await getEmployeePerformanceHistory(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-history-get-${suffix}`,
				employeeId: worker.employee.id,
				includeConfidential: false,
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) {
			return;
		}
		expect(history.data.employeeId).toBe(worker.employee.id);
		expect(history.data.entries.length).toBeGreaterThanOrEqual(1);

		const entry = history.data.entries.find(
			(historyEntry) => historyEntry.review.id === finalized.data.id,
		);
		expect(entry).toBeDefined();
		if (!entry) {
			return;
		}
		expect(
			entry.goals.some((cycleGoal) => cycleGoal.id === approvedGoal.data.id),
		).toBe(true);
		expect(entry.improvementPlans.some((pip) => pip.id === plan.data.id)).toBe(
			true,
		);
		expect(entry.overallRating).toBeNull();
	});

	it("improvement plan Slice 9.5 lifecycle with milestones, extension, and closure", async () => {
		const ready = createHrParityHarness(adapter);
		const worker = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `pip95-emp-${suffix}`,
		});
		const manager = await seedEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `pip95-mgr-${suffix}`,
		});

		const cycle = await createPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-cycle-${suffix}`,
				idempotencyKey: `idem-pip95-cycle-${suffix}`,
				code: `PIP95-CYCLE-${suffix}`,
				name: "PIP95 Cycle",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(cycle.ok).toBe(true);
		if (!cycle.ok) {
			return;
		}

		const openedCycle = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: `corr-pip95-open-${suffix}`,
			cycle: cycle.data,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
		expect(openedCycle.ok).toBe(true);
		if (!openedCycle.ok) {
			return;
		}

		const review = await startPerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-review-${suffix}`,
				cycleId: openedCycle.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok, resultMessage(review)).toBe(true);
		if (!review.ok) {
			return;
		}

		const self = await submitSelfAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-self-${suffix}`,
				reviewId: review.data.id,
				rating: "meets",
				actorEmployeeId: worker.employee.id,
				expectedVersion: review.data.version,
			},
			ready,
		);
		expect(self.ok).toBe(true);
		if (!self.ok) {
			return;
		}

		const managerReview = await submitManagerAssessment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-mgr-${suffix}`,
				reviewId: self.data.id,
				rating: "meets",
				managerEmployeeId: manager.employee.id,
				expectedVersion: self.data.version,
			},
			ready,
		);
		expect(managerReview.ok).toBe(true);
		if (!managerReview.ok) {
			return;
		}

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-finalize-${suffix}`,
				reviewId: managerReview.data.id,
				overallRating: "meets",
				idempotencyKey: `idem-pip95-finalize-${suffix}`,
				expectedVersion: managerReview.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}

		const plan = await createImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-create-${suffix}`,
				idempotencyKey: `idem-pip95-create-${suffix}`,
				reviewId: finalized.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				performanceGap: "Below expectations",
				expectedOutcome: "Meet baseline",
				measurableActions: "Weekly 1:1",
				supportResources: "Mentor",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: manager.employee.id,
				milestones: [
					{ dueDate: "2025-07-31" },
					{ dueDate: "2025-08-31" },
					{ dueDate: "2025-09-30" },
				],
			},
			ready,
		);
		expect(plan.ok, resultMessage(plan)).toBe(true);
		if (!plan.ok) {
			return;
		}
		expect(plan.data.status).toBe("draft");

		const checkpoints = await listImprovementPlanCheckpoints(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-checkpoints-${suffix}`,
				planId: plan.data.id,
			},
			ready,
		);
		expect(checkpoints.ok).toBe(true);
		if (!checkpoints.ok) {
			return;
		}
		expect(checkpoints.data.checkpoints).toHaveLength(3);

		const openedPlan = await openImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-open-${suffix}`,
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			ready,
		);
		expect(openedPlan.ok).toBe(true);
		if (!openedPlan.ok) {
			return;
		}
		await expectPipEvent({
			correlationId: `corr-pip95-open-${suffix}`,
			type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
			ready,
		});

		const active = await listActiveImprovementPlans(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-active-${suffix}`,
			},
			ready,
		);
		expect(active.ok).toBe(true);
		if (!active.ok) {
			return;
		}
		expect(active.data.plans.some((row) => row.id === openedPlan.data.id)).toBe(
			true,
		);

		const amended = await amendImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-amend-${suffix}`,
				planId: openedPlan.data.id,
				expectedVersion: openedPlan.data.version,
				performanceGap: "Revised parity gap",
				expectedOutcome: "Revised parity outcome",
			},
			ready,
		);
		expect(amended.ok).toBe(true);
		if (!amended.ok) {
			return;
		}

		const checkpoint1 = await recordImprovementCheckpoint(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-checkpoint-1-${suffix}`,
				planId: amended.data.id,
				sequenceNumber: 1,
				outcome: "met",
				notes: "Parity milestone 1",
				evidenceReference: `doc://pip95/${suffix}/m1`,
			},
			ready,
		);
		expect(checkpoint1.ok).toBe(true);
		if (!checkpoint1.ok) {
			return;
		}

		const extended = await amendImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-extend-${suffix}`,
				planId: amended.data.id,
				expectedVersion: amended.data.version,
				dueDate: "2025-10-31",
				extensionReason: "Parity extension reason",
				extensionEvidenceReference: `doc://pip95/${suffix}/ext`,
			},
			ready,
		);
		expect(extended.ok).toBe(true);
		if (!extended.ok) {
			return;
		}

		const afterExtend = await listImprovementPlanCheckpoints(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-checkpoints-ext-${suffix}`,
				planId: extended.data.id,
			},
			ready,
		);
		expect(afterExtend.ok).toBe(true);
		if (!afterExtend.ok) {
			return;
		}
		expect(afterExtend.data.checkpoints).toHaveLength(4);

		await runSequential([2, 3, 4], async (sequenceNumber) => {
			const recorded = await recordImprovementCheckpoint(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-pip95-checkpoint-${sequenceNumber}-${suffix}`,
					planId: extended.data.id,
					sequenceNumber,
					outcome: "met",
					notes: `Parity milestone ${sequenceNumber}`,
				},
				ready,
			);
			expect(recorded.ok).toBe(true);
		});

		const acknowledgedPlan = await acknowledgeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-ack-${suffix}`,
				planId: extended.data.id,
				expectedVersion: extended.data.version,
			},
			ready,
		);
		expect(acknowledgedPlan.ok).toBe(true);
		if (!acknowledgedPlan.ok) {
			return;
		}

		const completedPlan = await completeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-complete-${suffix}`,
				planId: acknowledgedPlan.data.id,
				expectedVersion: acknowledgedPlan.data.version,
				outcomeReason: "Parity completion",
				outcomeEvidenceReference: `doc://pip95/${suffix}/done`,
			},
			ready,
		);
		expect(completedPlan.ok).toBe(true);
		if (!completedPlan.ok) {
			return;
		}
		expect(completedPlan.data.status).toBe("completed");
		await expectPipEvent({
			correlationId: `corr-pip95-complete-${suffix}`,
			type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
			ready,
		});

		const failPlan = await createImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-create-${suffix}`,
				idempotencyKey: `idem-pip95-fail-create-${suffix}`,
				reviewId: finalized.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				performanceGap: "Below expectations",
				expectedOutcome: "Meet baseline",
				measurableActions: "Weekly 1:1",
				supportResources: "Mentor",
				dueDate: "2025-11-30",
				accountableManagerEmployeeId: manager.employee.id,
				milestones: [{ dueDate: "2025-10-31" }, { dueDate: "2025-11-30" }],
			},
			ready,
		);
		expect(failPlan.ok).toBe(true);
		if (!failPlan.ok) {
			return;
		}

		const openedFailPlan = await openImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-open-${suffix}`,
				planId: failPlan.data.id,
				expectedVersion: failPlan.data.version,
			},
			ready,
		);
		expect(openedFailPlan.ok).toBe(true);
		if (!openedFailPlan.ok) {
			return;
		}

		await recordImprovementCheckpoint(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-cp1-${suffix}`,
				planId: openedFailPlan.data.id,
				sequenceNumber: 1,
				outcome: "missed",
				notes: "Missed parity milestone",
			},
			ready,
		);
		await recordImprovementCheckpoint(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-cp2-${suffix}`,
				planId: openedFailPlan.data.id,
				sequenceNumber: 2,
				outcome: "met",
				notes: "Met parity milestone",
			},
			ready,
		);

		const acknowledgedFailPlan = await acknowledgeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-ack-${suffix}`,
				planId: openedFailPlan.data.id,
				expectedVersion: openedFailPlan.data.version,
			},
			ready,
		);
		expect(acknowledgedFailPlan.ok).toBe(true);
		if (!acknowledgedFailPlan.ok) {
			return;
		}

		const closedFailPlan = await closeImprovementPlanUnsuccessful(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-pip95-fail-close-${suffix}`,
				planId: acknowledgedFailPlan.data.id,
				expectedVersion: acknowledgedFailPlan.data.version,
				outcomeReason: "Parity unsuccessful closure",
			},
			ready,
		);
		expect(closedFailPlan.ok).toBe(true);
		if (!closedFailPlan.ok) {
			return;
		}
		expect(closedFailPlan.data.status).toBe("unsuccessful");
	});
}

describe("Performance parity [memory]", () => {
	definePerformanceParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)("Performance parity [drizzle]", () => {
	beforeAll(async () => {
		await ensurePerformanceSchemaForTests();
	});
	definePerformanceParitySuite("drizzle");
});
