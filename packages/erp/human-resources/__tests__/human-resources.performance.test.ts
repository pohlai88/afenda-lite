/**
 * Performance management domain rules matrix (HR-PERF-01).
 */

import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	acknowledgeImprovementPlan,
	createImprovementPlan,
	getImprovementPlanById,
	openImprovementPlan,
	recordImprovementCheckpoint,
} from "../src/performance/improvement-plan";
import {
	addCycleParticipant,
	closePerformanceCycle,
	createPerformanceCycle,
	getPerformanceCycleById,
	listCycleParticipants,
	openPerformanceCycle,
	removeCycleParticipant,
} from "../src/performance/performance-cycle";
import {
	approvePerformanceGoal,
	createPerformanceGoal,
	submitPerformanceGoal,
} from "../src/performance/goal";
import type { PerformanceReview } from "../src/types";
import {
	acknowledgePerformanceReview,
	finalizePerformanceReview,
	getPerformanceReviewById,
	listEmployeePerformanceReviews,
	reopenPerformanceReview,
	startPerformanceReview,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../src/performance/review";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-perf-a";
const ORG_B = "org-perf-b";
const ACTOR = "user-perf-1";

const RATING_SCALE = { codes: ["meets", "exceeds"] } as const;

const PERF_PERMISSIONS: readonly HumanResourcesPermission[] = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
];

function harness(
	permissions: readonly HumanResourcesPermission[] = PERF_PERMISSIONS,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedWorker(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; suffix: string },
) {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
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
			actorUserId: ACTOR,
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

async function seedOpenCycleWithParticipant(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		suffix: string;
		weightingModel?: "none" | "percent100";
		ratingScale?: { codes: string[] };
	},
) {
	const worker = await seedWorker(ready, {
		organizationId: input.organizationId,
		suffix: input.suffix,
	});
	const cycle = await createPerformanceCycle(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-cycle-${input.suffix}`,
			idempotencyKey: `idem-cycle-${input.suffix}`,
			code: `FY-${input.suffix}`,
			name: `Cycle ${input.suffix}`,
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			ratingScale: input.ratingScale ?? RATING_SCALE,
			weightingModel: input.weightingModel ?? "percent100",
		},
		ready,
	);
	if (!cycle.ok) {
		throw new Error(`Failed to create cycle: ${cycle.code}`);
	}
	const opened = await openPerformanceCycle(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-open-${input.suffix}`,
			cycleId: cycle.data.id,
			expectedVersion: cycle.data.version,
		},
		ready,
	);
	if (!opened.ok) {
		throw new Error(`Failed to open cycle: ${opened.code}`);
	}
	const participant = await addCycleParticipant(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-part-${input.suffix}`,
			cycleId: opened.data.id,
			employeeId: worker.employee.id,
			employmentId: worker.employment.id,
		},
		ready,
	);
	if (!participant.ok) {
		throw new Error(`Failed to add participant: ${participant.code}`);
	}
	return { ...worker, cycle: opened.data, participant: participant.data };
}

async function seedReviewAtManagerSubmitted(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		suffix: string;
		weightingModel?: "none" | "percent100";
	},
) {
	const manager = await seedWorker(ready, {
		organizationId: input.organizationId,
		suffix: `${input.suffix}-mgr`,
	});
	const seeded = await seedOpenCycleWithParticipant(ready, {
		organizationId: input.organizationId,
		suffix: input.suffix,
		weightingModel: input.weightingModel ?? "none",
	});
	const review = await startPerformanceReview(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-review-${input.suffix}`,
			cycleId: seeded.cycle.id,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			managerEmployeeId: manager.employee.id,
		},
		ready,
	);
	if (!review.ok) {
		throw new Error(`Failed to start review: ${review.code}`);
	}
	const self = await submitSelfAssessment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-self-${input.suffix}`,
			reviewId: review.data.id,
			rating: "meets",
			actorEmployeeId: seeded.employee.id,
			expectedVersion: review.data.version,
		},
		ready,
	);
	if (!self.ok) {
		throw new Error(`Failed self assessment: ${self.code}`);
	}
	const managerAssessment = await submitManagerAssessment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-mgr-${input.suffix}`,
			reviewId: self.data.id,
			rating: "exceeds",
			commentsSensitive: "Manager confidential note",
			managerEmployeeId: manager.employee.id,
			expectedVersion: self.data.version,
		},
		ready,
	);
	if (!managerAssessment.ok) {
		throw new Error(`Failed manager assessment: ${managerAssessment.code}`);
	}
	return {
		...seeded,
		manager,
		review: managerAssessment.data,
	};
}

async function finalizeReview(
	ready: ReturnType<typeof harness>,
	review: PerformanceReview,
	idempotencyKey: string,
) {
	return finalizePerformanceReview(
		{
			organizationId: review.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-finalize-${idempotencyKey}`,
			reviewId: review.id,
			overallRating: "meets",
			idempotencyKey,
			expectedVersion: review.version,
		},
		ready,
	);
}

describe("Performance cycle lifecycle", () => {
	it("creates cycle idempotently → opens → emits cycle opened event", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();

		const created = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cycle-1",
				idempotencyKey: "idem-cycle-1",
				code: "FY25",
				name: "FY 2025",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			{ ...ready, ports },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const retry = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cycle-1-retry",
				idempotencyKey: "idem-cycle-1",
				code: "FY25",
				name: "FY 2025",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(retry.ok).toBe(true);
		if (!retry.ok) return;
		expect(retry.data.id).toBe(created.data.id);

		const conflict = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cycle-conflict",
				idempotencyKey: "idem-cycle-1",
				code: "FY25-B",
				name: "Different",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: { codes: ["meets"] },
				weightingModel: "none",
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		expect(humanResourcesCodeFromResult(conflict)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);

		const opened = await openPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-open-1",
				cycleId: created.data.id,
				expectedVersion: created.data.version,
			},
			{ ...ready, ports },
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;
		expect(opened.data.status).toBe("open");
		expect(ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
			}),
		);
	});

	it("rejects invalid cycle period dates", async () => {
		const ready = harness();
		const invalid = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-invalid-dates",
				idempotencyKey: "idem-invalid-dates",
				code: "BAD-DATES",
				name: "Invalid dates",
				periodStart: "2025-12-31",
				periodEnd: "2025-01-01",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("records audit on cycle close without compensation side effects", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "close-audit",
			weightingModel: "none",
		});

		const closed = await closePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-close",
				cycleId: seeded.cycle.id,
				expectedVersion: seeded.cycle.version,
			},
			{ ...ready, ports },
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");
		expect(ports.audit.calls).toContainEqual(
			expect.objectContaining({
				entity: "hr_performance_cycle",
				entityId: seeded.cycle.id,
				action: "UPDATE",
			}),
		);
		expect("journal" in ports).toBe(false);
	});

	it("rejects cross-organization cycle read", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "cross",
		});

		const foreign = await getPerformanceCycleById(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-cross-get",
				cycleId: seeded.cycle.id,
			},
			ready,
		);
		expect(foreign.ok).toBe(true);
		if (!foreign.ok) return;
		expect(foreign.data).toBeNull();
	});
});

describe("Performance cycle participants", () => {
	it("rejects goals and reviews for inactive participants", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "inactive",
			weightingModel: "none",
		});

		const removed = await removeCycleParticipant(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-remove-part",
				cycleId: seeded.cycle.id,
				participantId: seeded.participant.id,
				expectedVersion: seeded.participant.version,
			},
			ready,
		);
		expect(removed.ok).toBe(true);
		if (!removed.ok) return;

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-inactive-goal",
				idempotencyKey: "idem-inactive-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				title: "Inactive goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok).toBe(false);
		expect(humanResourcesCodeFromResult(goal)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const manager = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "inactive-mgr",
		});
		const review = await startPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-inactive-review",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok).toBe(false);
		expect(humanResourcesCodeFromResult(review)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const participants = await listCycleParticipants(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-inactive",
				cycleId: seeded.cycle.id,
			},
			ready,
		);
		expect(participants.ok).toBe(true);
		if (!participants.ok) return;
		expect(participants.data).toHaveLength(1);
		expect(participants.data[0]?.status).toBe("removed");
	});
});

describe("Performance goals", () => {
	it("requires approved goal weights to sum to 100", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goals",
			weightingModel: "percent100",
		});

		const goalA = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-a",
				idempotencyKey: "idem-goal-a",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				title: "Goal A",
				weight: "60",
				periodStart: "2025-01-01",
				periodEnd: "2025-06-30",
			},
			ready,
		);
		expect(goalA.ok).toBe(true);
		if (!goalA.ok) return;

		const goalB = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-b",
				idempotencyKey: "idem-goal-b",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				title: "Goal B",
				weight: "30",
				periodStart: "2025-07-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goalB.ok).toBe(true);
		if (!goalB.ok) return;

		let submittedA = goalA.data;
		let submittedB = goalB.data;
		for (const goal of [goalA.data, goalB.data]) {
			const submitted = await submitPerformanceGoal(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-submit-${goal.id}`,
					goalId: goal.id,
					expectedVersion: goal.version,
				},
				ready,
			);
			expect(submitted.ok).toBe(true);
			if (!submitted.ok) return;
			if (goal.id === goalA.data.id) {
				submittedA = submitted.data;
			} else {
				submittedB = submitted.data;
			}
		}

		const approvedA = await approvePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-approve-a",
				goalId: submittedA.id,
				expectedVersion: submittedA.version,
			},
			ready,
		);
		expect(approvedA.ok).toBe(true);

		const approvedB = await approvePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-approve-b",
				goalId: submittedB.id,
				expectedVersion: submittedB.version,
			},
			ready,
		);
		expect(approvedB.ok).toBe(false);
		expect(humanResourcesCodeFromResult(approvedB)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects goal period outside cycle unless exception flag is set", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-dates",
			weightingModel: "none",
		});

		const outside = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-outside-goal",
				idempotencyKey: "idem-outside-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				title: "Outside cycle",
				weight: "100",
				periodStart: "2024-01-01",
				periodEnd: "2024-12-31",
			},
			ready,
		);
		expect(outside.ok).toBe(false);
		expect(humanResourcesCodeFromResult(outside)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const exception = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-exception-goal",
				idempotencyKey: "idem-exception-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				title: "Exception goal",
				weight: "100",
				periodStart: "2024-01-01",
				periodEnd: "2024-12-31",
				exceptionOutsideCycle: true,
			},
			ready,
		);
		expect(exception.ok).toBe(true);
	});
});

describe("Performance review workflow", () => {
	it("runs review workflow → finalizes idempotently → reopens with permission", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "review",
		});

		const acknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ack",
				reviewId: seeded.review.id,
				acknowledgementNote:
					"I do not agree with this rating but acknowledge receipt.",
				expectedVersion: seeded.review.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;
		expect(acknowledged.data.status).toBe("acknowledged");
		expect(acknowledged.data.acknowledgementNote).toContain("do not agree");

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-finalize",
				reviewId: acknowledged.data.id,
				overallRating: "meets",
				idempotencyKey: "idem-finalize-1",
				expectedVersion: acknowledged.data.version,
			},
			{ ...ready, ports },
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;
		expect(finalized.data.status).toBe("finalized");
		expect(ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
			}),
		);

		const idempotent = await finalizePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-finalize-retry",
				reviewId: acknowledged.data.id,
				overallRating: "meets",
				idempotencyKey: "idem-finalize-1",
				expectedVersion: 99,
			},
			ready,
		);
		expect(idempotent.ok).toBe(true);
		if (!idempotent.ok) return;
		expect(idempotent.data.id).toBe(finalized.data.id);

		const reopened = await reopenPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-reopen",
				reviewId: finalized.data.id,
				reason: "Calibration adjustment",
				expectedVersion: finalized.data.version,
			},
			{ ...ready, ports },
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) return;
		expect(reopened.data.status).toBe("reopened");
		expect(ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
			}),
		);
	});

	it("rejects self-manager review assignment", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "self-mgr",
			weightingModel: "none",
		});

		const blocked = await startPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-self-mgr",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				managerEmployeeId: seeded.employee.id,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects unauthorized reviewer", async () => {
		const ready = harness();
		const manager = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "unauth-mgr",
		});
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "unauth",
			weightingModel: "none",
		});
		const outsider = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "outsider",
		});
		const review = await startPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-unauth-review",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok).toBe(true);
		if (!review.ok) return;

		const unauthorized = await submitManagerAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-unauth-mgr",
				reviewId: review.data.id,
				rating: "meets",
				managerEmployeeId: outsider.employee.id,
				expectedVersion: review.data.version,
			},
			ready,
		);
		expect(unauthorized.ok).toBe(false);
		expect(humanResourcesCodeFromResult(unauthorized)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects invalid rating outside approved scale", async () => {
		const ready = harness();
		const manager = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "rating-mgr",
		});
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "rating",
			weightingModel: "none",
		});
		const review = await startPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rating-review",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				managerEmployeeId: manager.employee.id,
			},
			ready,
		);
		expect(review.ok).toBe(true);
		if (!review.ok) return;

		const invalid = await submitSelfAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-invalid-rating",
				reviewId: review.data.id,
				rating: "outstanding",
				actorEmployeeId: seeded.employee.id,
				expectedVersion: review.data.version,
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("blocks mutations on finalized reviews", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "immutable",
		});
		const finalized = await finalizeReview(ready, seeded.review, "idem-immutable");
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;

		const mutate = await submitSelfAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-immutable-self",
				reviewId: finalized.data.id,
				rating: "meets",
				actorEmployeeId: seeded.employee.id,
				expectedVersion: finalized.data.version,
			},
			ready,
		);
		expect(mutate.ok).toBe(false);
		expect(humanResourcesCodeFromResult(mutate)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("redacts confidential review fields for own read without confidential.read", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const fullReady = {
			store,
			ports,
			authorization: createGrantingHumanResourcesAuthorization(PERF_PERMISSIONS),
		};
		const ownReadReady = {
			store,
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			]),
		};
		const seeded = await seedReviewAtManagerSubmitted(fullReady, {
			organizationId: ORG_A,
			suffix: "redact",
		});

		const redacted = await getPerformanceReviewById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-redacted",
				reviewId: seeded.review.id,
				includeConfidential: false,
			},
			ownReadReady,
		);
		expect(redacted.ok).toBe(true);
		if (!redacted.ok) return;
		expect(redacted.data?.review.overallRating).toBeNull();
		expect(redacted.data?.assessments[0]?.rating).toBeNull();
		expect(redacted.data?.assessments[0]?.commentsSensitive).toBeNull();

		const listRedacted = await listEmployeePerformanceReviews(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-redacted",
				employeeId: seeded.employee.id,
				includeConfidential: false,
			},
			ownReadReady,
		);
		expect(listRedacted.ok).toBe(true);
		if (!listRedacted.ok) return;
		expect(listRedacted.data.reviews[0]?.overallRating).toBeNull();

		const blocked = await getPerformanceReviewById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-confidential-blocked",
				reviewId: seeded.review.id,
				includeConfidential: true,
			},
			ownReadReady,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const confidential = await getPerformanceReviewById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-confidential-allowed",
				reviewId: seeded.review.id,
				includeConfidential: true,
			},
			fullReady,
		);
		expect(confidential.ok).toBe(true);
		if (!confidential.ok) return;
		expect(
			confidential.data?.assessments.some(
				(assessment) => assessment.rating !== null,
			),
		).toBe(true);
	});
});

describe("Performance improvement plan", () => {
	it("creates PIP from finalized review, records checkpoints, and opens", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "pip",
		});
		const finalized = await finalizeReview(ready, seeded.review, "idem-pip-finalize");
		if (!finalized.ok) throw new Error(finalized.code);

		const plan = await createImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-create",
				idempotencyKey: "idem-pip-1",
				reviewId: finalized.data.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				performanceGap: "Missed targets",
				expectedOutcome: "Meet Q3 targets",
				measurableActions: "Weekly check-ins",
				supportResources: "Coaching",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: seeded.manager.employee.id,
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const loaded = await getImprovementPlanById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-get",
				planId: plan.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);

		const opened = await openImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-open",
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			{ ...ready, ports },
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;
		expect(ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
			}),
		);

		const checkpoint = await recordImprovementCheckpoint(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-checkpoint",
				planId: opened.data.id,
				sequenceNumber: 1,
				outcome: "met",
				notes: "On track",
			},
			ready,
		);
		expect(checkpoint.ok).toBe(true);
		if (!checkpoint.ok) return;
		expect(checkpoint.data.outcome).toBe("met");

		const duplicateCheckpoint = await recordImprovementCheckpoint(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-checkpoint-dup",
				planId: opened.data.id,
				sequenceNumber: 1,
				outcome: "missed",
				notes: "Retry",
			},
			ready,
		);
		expect(duplicateCheckpoint.ok).toBe(false);
		expect(humanResourcesCodeFromResult(duplicateCheckpoint)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const acknowledged = await acknowledgeImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-ack",
				planId: opened.data.id,
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
	});
});

describe("Performance authorization and concurrency", () => {
	it("denies cycle create without performance.manage", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ]);
		const denied = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-denied",
				idempotencyKey: "idem-denied",
				code: "DENIED",
				name: "Denied",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("denies exceptional reopen without performance.review.reopen", async () => {
		const ready = harness(
			PERF_PERMISSIONS.filter(
				(permission) =>
					permission !== HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
			),
		);
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "reopen-denied",
		});
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-reopen-denied",
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;

		const denied = await reopenPerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-reopen-denied",
				reviewId: finalized.data.id,
				reason: "Should fail",
				expectedVersion: finalized.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("rejects stale version on cycle open", async () => {
		const ready = harness();
		const created = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale",
				idempotencyKey: "idem-stale",
				code: "STALE",
				name: "Stale",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const stale = await openPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-open",
				cycleId: created.data.id,
				expectedVersion: 99,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		expect(humanResourcesCodeFromResult(stale)).toBe(
			HUMAN_RESOURCES_ERROR_STALE_VERSION,
		);
	});

	it("performance mutations emit audit/outbox only (no compensation journal ports)", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();
		await seedOpenCycleWithParticipant(
			{ ...ready, ports },
			{ organizationId: ORG_A, suffix: "ports", weightingModel: "none" },
		);
		expect(ports.audit.calls.length).toBeGreaterThan(0);
		expect(Object.keys(ports)).toEqual(["audit", "outbox"]);
	});
});
