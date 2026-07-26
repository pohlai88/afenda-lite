/**
 * Performance management domain rules matrix (HR-PERF-01).
 */

import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { amendEmployment, createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	activatePerformanceGoal,
	alignPerformanceGoal,
	approvePerformanceGoal,
	closePerformanceGoal,
	createPerformanceGoal,
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
	getImprovementPlanById,
	listActiveImprovementPlans,
	listImprovementPlanCheckpoints,
	openImprovementPlan,
	recordImprovementCheckpoint,
} from "../src/performance/improvement-plan";
import {
	addCycleParticipant,
	closePerformanceCycle,
	createPerformanceCycle,
	enrollEligibleCycleParticipants,
	getPerformanceCycleById,
	getPerformanceCycleEligibility,
	listCycleParticipants,
	listPerformanceCycleReviewPeriods,
	openPerformanceCycle,
	publishPerformanceCycle,
	removeCycleParticipant,
	setPerformanceCycleReviewPeriods,
	updatePerformanceCycle,
} from "../src/performance/performance-cycle";
import {
	acknowledgePerformanceReview,
	addDelegatedReviewer,
	calibratePerformanceReview,
	finalizePerformanceReview,
	getEmployeePerformanceHistory,
	getPerformanceReviewById,
	listEmployeePerformanceReviews,
	reopenPerformanceReview,
	startPerformanceReview,
	submitDelegatedAssessment,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../src/performance/review";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_CONFIDENTIAL_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import type { PerformanceReview } from "../src/types";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import {
	DEFAULT_PERFORMANCE_CYCLE_REVIEW_PERIODS,
	publishAndOpenPerformanceCycle,
	publishPerformanceCycleReady,
} from "./helpers/performance-cycle-harness";
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
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
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
	const identityResolver = createStoreBackedIdentityResolver(store);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
		identityResolver,
	});
}

async function seedWorker(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; suffix: string; startsOn?: string },
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
	const mapped = await mapActorToEmployee(ready.store, {
		organizationId: input.organizationId,
		userId: ACTOR,
		employeeId: employee.data.id,
		actorUserId: ACTOR,
		effectiveFrom: "2025-01-01",
	});
	if (!mapped.ok) {
		throw new Error(`Failed to map actor to employee: ${mapped.code}`);
	}
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: input.startsOn ?? "2025-01-01",
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
	const opened = await publishAndOpenPerformanceCycle(ready, {
		organizationId: input.organizationId,
		actorUserId: ACTOR,
		correlationIdPrefix: `corr-open-${input.suffix}`,
		cycle: cycle.data,
		participant: {
			employeeId: worker.employee.id,
			employmentId: worker.employment.id,
		},
	});
	if (!opened.ok) {
		throw new Error(`Failed to open cycle: ${opened.code}`);
	}
	const participants = await listCycleParticipants(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-part-list-${input.suffix}`,
			cycleId: opened.data.id,
		},
		ready,
	);
	if (!participants.ok || participants.data.length === 0) {
		throw new Error("Failed to resolve cycle participant after open");
	}
	const participant = participants.data[0];
	if (participant === undefined) {
		throw new Error("Failed to resolve cycle participant after open");
	}
	return {
		...worker,
		cycle: opened.data,
		participant,
	};
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
		const worker = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "open-1",
		});

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

		const opened = await publishAndOpenPerformanceCycle(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-open-1",
			cycle: created.data,
			ports,
			participant: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
		});
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

describe("Slice 9.2 — Performance cycles", () => {
	async function seedDraftCycle(
		ready: ReturnType<typeof harness>,
		suffix: string,
		input?: { ratingScale?: { codes: string[] } },
	) {
		const created = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-92-cycle-${suffix}`,
				idempotencyKey: `idem-92-cycle-${suffix}`,
				code: `FY92-${suffix}`,
				name: `Slice 9.2 ${suffix}`,
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: input?.ratingScale ?? RATING_SCALE,
				weightingModel: "none",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			throw new Error(`Failed to seed draft cycle: ${created.code}`);
		}
		return created.data;
	}

	it("runs draft → publish → open → close lifecycle", async () => {
		const ready = harness();
		const worker = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "lifecycle",
		});
		const draft = await seedDraftCycle(ready, "lifecycle");

		const published = await publishPerformanceCycleReady(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-92-lifecycle",
			cycle: draft,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) return;
		expect(published.data.status).toBe("published");

		const participant = await addCycleParticipant(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-lifecycle-part",
				cycleId: published.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			ready,
		);
		expect(participant.ok).toBe(true);
		if (!participant.ok) return;

		const opened = await openPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-lifecycle-open",
				cycleId: published.data.id,
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;
		expect(opened.data.status).toBe("open");

		const closed = await closePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-lifecycle-close",
				cycleId: opened.data.id,
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");
	});

	it("rejects publish without eligibility or required review periods", async () => {
		const ready = harness();
		const draft = await seedDraftCycle(ready, "publish-guards");

		const missingEverything = await publishPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-publish-missing",
				cycleId: draft.id,
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(missingEverything.ok).toBe(false);
		expect(humanResourcesCodeFromResult(missingEverything)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const periodsOnly = await setPerformanceCycleReviewPeriods(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-periods-only",
				cycleId: draft.id,
				periods: DEFAULT_PERFORMANCE_CYCLE_REVIEW_PERIODS,
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(periodsOnly.ok).toBe(true);
		if (!periodsOnly.ok) return;

		const missingEligibility = await publishPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-publish-no-eligibility",
				cycleId: draft.id,
				expectedVersion: draft.version + 1,
			},
			ready,
		);
		expect(missingEligibility.ok).toBe(false);
		expect(humanResourcesCodeFromResult(missingEligibility)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects duplicate rating scale codes on create and publish", async () => {
		const ready = harness();
		const duplicateCreate = await createPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-dup-scale-create",
				idempotencyKey: "idem-92-dup-scale-create",
				code: "DUP-SCALE",
				name: "Duplicate scale",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
				ratingScale: { codes: ["meets", "meets"] },
				weightingModel: "none",
			},
			ready,
		);
		expect(duplicateCreate.ok).toBe(false);
		expect(humanResourcesCodeFromResult(duplicateCreate)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const draft = await seedDraftCycle(ready, "dup-scale-publish", {
			ratingScale: { codes: ["a", "b"] },
		});
		const duplicateUpdate = await updatePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-dup-scale-update",
				cycleId: draft.id,
				ratingScale: { codes: ["x", "x"] },
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(duplicateUpdate.ok).toBe(false);
		expect(humanResourcesCodeFromResult(duplicateUpdate)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("allows rating scale update while draft and rejects after publish", async () => {
		const ready = harness();
		const draft = await seedDraftCycle(ready, "scale-mutability");

		const updated = await updatePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-scale-update",
				cycleId: draft.id,
				ratingScale: { codes: ["developing", "strong"] },
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		expect(updated.data.ratingScale.codes).toEqual(["developing", "strong"]);

		const published = await publishPerformanceCycleReady(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-92-scale-publish",
			cycle: updated.data,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const blocked = await updatePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-scale-blocked",
				cycleId: published.data.id,
				name: "Renamed after publish",
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("rejects review periods outside cycle bounds and overlapping kinds", async () => {
		const ready = harness();
		const draft = await seedDraftCycle(ready, "review-periods");

		const outside = await setPerformanceCycleReviewPeriods(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-period-outside",
				cycleId: draft.id,
				periods: [
					{
						kind: "self_review",
						periodStart: "2024-12-01",
						periodEnd: "2025-01-15",
					},
					{
						kind: "manager_review",
						periodStart: "2025-02-01",
						periodEnd: "2025-03-01",
					},
				],
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(outside.ok).toBe(false);
		expect(humanResourcesCodeFromResult(outside)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const overlap = await setPerformanceCycleReviewPeriods(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-period-overlap",
				cycleId: draft.id,
				periods: [
					{
						kind: "self_review",
						periodStart: "2025-01-01",
						periodEnd: "2025-06-30",
					},
					{
						kind: "self_review",
						periodStart: "2025-06-01",
						periodEnd: "2025-12-31",
					},
				],
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(overlap.ok).toBe(false);
		expect(humanResourcesCodeFromResult(overlap)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("enrolls eligible population and gates manual add by eligibility", async () => {
		const ready = harness();
		const eligible = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "eligible",
			startsOn: "2024-01-01",
		});
		const ineligible = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "ineligible",
		});
		const draft = await seedDraftCycle(ready, "enroll");

		const published = await publishPerformanceCycleReady(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-92-enroll",
			cycle: draft,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const terminated = await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-ineligible-term",
				employmentId: ineligible.employment.id,
				status: "terminated",
				expectedVersion: ineligible.employment.version,
			},
			ready,
		);
		expect(terminated.ok).toBe(true);
		if (!terminated.ok) return;

		const enrolled = await enrollEligibleCycleParticipants(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-enroll-bulk",
				cycleId: published.data.id,
				asOfDate: "2025-06-01",
			},
			ready,
		);
		expect(enrolled.ok).toBe(true);
		if (!enrolled.ok) return;
		expect(
			enrolled.data.some(
				(participant) => participant.employeeId === eligible.employee.id,
			),
		).toBe(true);
		expect(
			enrolled.data.some(
				(participant) => participant.employeeId === ineligible.employee.id,
			),
		).toBe(false);

		const blocked = await addCycleParticipant(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-enroll-blocked",
				cycleId: published.data.id,
				employeeId: ineligible.employee.id,
				employmentId: ineligible.employment.id,
				asOfDate: "2025-06-01",
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const eligibility = await getPerformanceCycleEligibility(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-get-eligibility",
				cycleId: published.data.id,
			},
			ready,
		);
		expect(eligibility.ok).toBe(true);
		if (!eligibility.ok) return;
		expect(eligibility.data?.allowedEmploymentStatuses).toContain("active");

		const reviewPeriods = await listPerformanceCycleReviewPeriods(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-list-periods",
				cycleId: published.data.id,
			},
			ready,
		);
		expect(reviewPeriods.ok).toBe(true);
		if (!reviewPeriods.ok) return;
		expect(reviewPeriods.data).toHaveLength(2);
	});

	it("blocks open from draft and close from published", async () => {
		const ready = harness();
		const draft = await seedDraftCycle(ready, "transitions");

		const openFromDraft = await openPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-open-draft",
				cycleId: draft.id,
				expectedVersion: draft.version,
			},
			ready,
		);
		expect(openFromDraft.ok).toBe(false);
		expect(humanResourcesCodeFromResult(openFromDraft)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const published = await publishPerformanceCycleReady(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-92-close-published",
			cycle: draft,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const closeFromPublished = await closePerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-92-close-published",
				cycleId: published.data.id,
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(closeFromPublished.ok).toBe(false);
		expect(humanResourcesCodeFromResult(closeFromPublished)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
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
				goalKind: "employee",
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
				goalKind: "employee",
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
				goalKind: "employee",
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
				goalKind: "employee",
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
				goalKind: "employee",
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

	it("runs employee goal lifecycle with progress evidence and completion", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-lifecycle-employee",
			weightingModel: "percent100",
		});

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle",
				idempotencyKey: "idem-goal-lifecycle",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "Lifecycle goal",
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
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-submit",
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const approved = await approvePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-approve",
				goalId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const activated = await activatePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-activate",
				goalId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;
		expect(activated.data.status).toBe("active");

		const progress = await recordGoalProgress(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-progress",
				goalId: activated.data.id,
				progressNote: "On track",
				progressValue: "50",
				evidenceReference: "doc://evidence/1",
			},
			ready,
		);
		expect(progress.ok).toBe(true);
		if (!progress.ok) return;
		expect(progress.data.evidenceReference).toBe("doc://evidence/1");

		const progressPage = await listGoalProgress(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-list-progress",
				goalId: activated.data.id,
				page: 1,
				pageSize: 10,
			},
			ready,
		);
		expect(progressPage.ok).toBe(true);
		if (!progressPage.ok) return;
		expect(progressPage.data.progress).toHaveLength(1);

		const closed = await closePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-lifecycle-close",
				goalId: activated.data.id,
				expectedVersion: activated.data.version,
				completionNote: "Delivered",
				completionEvidenceReference: "doc://completion/1",
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("closed");
		expect(closed.data.completionNote).toBe("Delivered");
		expect(closed.data.completionEvidenceReference).toBe("doc://completion/1");
	});

	it("creates manager-assigned goals as approved and allows employee progress", async () => {
		const ready = harness();
		const manager = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "goal-mgr-assign-mgr",
		});
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-mgr-assign",
			weightingModel: "none",
		});

		const managerGoal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-manager-goal",
				idempotencyKey: "idem-manager-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "manager",
				title: "Manager assigned goal",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(managerGoal.ok).toBe(true);
		if (!managerGoal.ok) return;
		expect(managerGoal.data.status).toBe("approved");
		expect(managerGoal.data.goalKind).toBe("manager");

		const submitManagerGoal = await submitPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-manager-goal-submit",
				goalId: managerGoal.data.id,
				expectedVersion: managerGoal.data.version,
			},
			ready,
		);
		expect(submitManagerGoal.ok).toBe(false);

		const activated = await activatePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-manager-goal-activate",
				goalId: managerGoal.data.id,
				expectedVersion: managerGoal.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;

		const progress = await recordGoalProgress(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-manager-goal-progress",
				goalId: activated.data.id,
				progressNote: "Employee update",
				progressValue: "25",
			},
			ready,
		);
		expect(progress.ok).toBe(true);

		const closed = await closePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-manager-goal-close",
				goalId: activated.data.id,
				expectedVersion: activated.data.version,
				completionNote: null,
				completionEvidenceReference: null,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		expect(manager.employee.id).toBeDefined();
	});

	it("requires weight on submit when cycle uses percent100 weighting", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-weight-submit",
			weightingModel: "percent100",
		});

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-weight-submit",
				idempotencyKey: "idem-goal-weight-submit",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "Unweighted goal",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(goal.ok).toBe(true);
		if (!goal.ok) return;

		const submitted = await submitPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-goal-weight-submit-fail",
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(false);
		expect(humanResourcesCodeFromResult(submitted)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("aligns employee goals to manager goals with cycle and kind guards", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-align",
			weightingModel: "none",
		});
		const otherCycle = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-align-other",
			weightingModel: "none",
		});

		const managerGoal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-manager-goal",
				idempotencyKey: "idem-align-manager-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "manager",
				title: "Manager alignment parent",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(managerGoal.ok).toBe(true);
		if (!managerGoal.ok) return;

		const employeeGoal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-employee-goal",
				idempotencyKey: "idem-align-employee-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "Employee alignment child",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(employeeGoal.ok).toBe(true);
		if (!employeeGoal.ok) return;

		const aligned = await alignPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-goal",
				goalId: employeeGoal.data.id,
				alignedToGoalId: managerGoal.data.id,
				expectedVersion: employeeGoal.data.version,
			},
			ready,
		);
		expect(aligned.ok).toBe(true);
		if (!aligned.ok) return;
		expect(aligned.data.alignedToGoalId).toBe(managerGoal.data.id);

		const otherCycleManagerGoal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-other-cycle-goal",
				idempotencyKey: "idem-align-other-cycle-goal",
				cycleId: otherCycle.cycle.id,
				employeeId: otherCycle.employee.id,
				employmentId: otherCycle.employment.id,
				goalKind: "manager",
				title: "Other cycle manager goal",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			ready,
		);
		expect(otherCycleManagerGoal.ok).toBe(true);
		if (!otherCycleManagerGoal.ok) return;

		const crossCycleAlign = await alignPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-wrong-cycle",
				goalId: employeeGoal.data.id,
				alignedToGoalId: otherCycleManagerGoal.data.id,
				expectedVersion: aligned.data.version,
			},
			ready,
		);
		expect(crossCycleAlign.ok).toBe(false);
		expect(humanResourcesCodeFromResult(crossCycleAlign)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const selfAlign = await alignPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-self",
				goalId: employeeGoal.data.id,
				alignedToGoalId: employeeGoal.data.id,
				expectedVersion: aligned.data.version,
			},
			ready,
		);
		expect(selfAlign.ok).toBe(false);

		const employeeParentGoal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-employee-parent",
				idempotencyKey: "idem-align-employee-parent",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "Employee parent",
				periodStart: "2025-01-01",
				periodEnd: "2025-06-30",
			},
			ready,
		);
		expect(employeeParentGoal.ok).toBe(true);
		if (!employeeParentGoal.ok) return;

		const alignToEmployeeParent = await alignPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-align-employee-parent",
				goalId: employeeGoal.data.id,
				alignedToGoalId: employeeParentGoal.data.id,
				expectedVersion: aligned.data.version,
			},
			ready,
		);
		expect(alignToEmployeeParent.ok).toBe(false);
	});

	it("denies employee goal manager actions and manager-kind create without manager scope", async () => {
		const ready = harness();
		const seeded = await seedOpenCycleWithParticipant(ready, {
			organizationId: ORG_A,
			suffix: "goal-authz",
			weightingModel: "percent100",
		});
		const employeeOnly = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
			]),
		};

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-goal",
				idempotencyKey: "idem-authz-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "Authz goal",
				weight: "100",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			employeeOnly,
		);
		expect(goal.ok).toBe(true);
		if (!goal.ok) return;

		const submitted = await submitPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-submit",
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			employeeOnly,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const selfApprove = await approvePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-approve",
				goalId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			employeeOnly,
		);
		expect(selfApprove.ok).toBe(false);
		expect(humanResourcesCodeFromResult(selfApprove)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const managerKindCreate = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-manager-create",
				idempotencyKey: "idem-authz-manager-create",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "manager",
				title: "Forbidden manager goal",
				periodStart: "2025-01-01",
				periodEnd: "2025-12-31",
			},
			employeeOnly,
		);
		expect(managerKindCreate.ok).toBe(false);
		expect(humanResourcesCodeFromResult(managerKindCreate)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
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
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-immutable",
		);
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
		const identityResolver = createStoreBackedIdentityResolver(store);
		const fullReady = createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization:
				createGrantingHumanResourcesAuthorization(PERF_PERMISSIONS),
			identityResolver,
		});
		const ownReadReady = createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			]),
			identityResolver,
		});
		const seeded = await seedReviewAtManagerSubmitted(fullReady, {
			organizationId: ORG_A,
			suffix: "redact",
		});
		const calibrated = await calibratePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-redact-calibrate",
				reviewId: seeded.review.id,
				overallRating: "meets",
				calibrationNote: "HR calibration note for redaction test",
				expectedVersion: seeded.review.version,
			},
			fullReady,
		);
		expect(calibrated.ok).toBe(true);
		if (!calibrated.ok) return;

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
		expect(redacted.data?.review.calibrationNote).toBeNull();
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

	it("enforces delegated reviewer chain before finalize", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "delegated-chain",
		});
		const reviewer1 = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "delegated-1",
		});
		const reviewer2 = await seedWorker(ready, {
			organizationId: ORG_A,
			suffix: "delegated-2",
		});

		const addFirst = await addDelegatedReviewer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-1",
				reviewId: seeded.review.id,
				delegatedEmployeeId: reviewer1.employee.id,
				expectedVersion: seeded.review.version,
			},
			ready,
		);
		expect(addFirst.ok).toBe(true);
		if (!addFirst.ok) return;

		const addSecond = await addDelegatedReviewer(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-2",
				reviewId: addFirst.data.id,
				delegatedEmployeeId: reviewer2.employee.id,
				expectedVersion: addFirst.data.version,
			},
			ready,
		);
		expect(addSecond.ok).toBe(true);
		if (!addSecond.ok) return;

		const detail = await getPerformanceReviewById(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-detail",
				reviewId: addSecond.data.id,
				includeConfidential: true,
			},
			ready,
		);
		expect(detail.ok).toBe(true);
		if (!detail.ok || !detail.data) return;
		const delegatedParticipants = detail.data.participants
			.filter((participant) => participant.role === "delegated")
			.toSorted((a, b) => a.sequenceNumber - b.sequenceNumber);
		expect(delegatedParticipants).toHaveLength(2);

		const blockedSecond = await submitDelegatedAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-second-early",
				reviewId: addSecond.data.id,
				participantId: delegatedParticipants[1]?.id,
				rating: "meets",
				commentsSensitive: "Second reviewer confidential",
				delegatedEmployeeId: reviewer2.employee.id,
				expectedVersion: addSecond.data.version,
			},
			ready,
		);
		expect(blockedSecond.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blockedSecond)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const firstSubmit = await submitDelegatedAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-first",
				reviewId: addSecond.data.id,
				participantId: delegatedParticipants[0]?.id,
				rating: "meets",
				commentsSensitive: "First reviewer confidential",
				delegatedEmployeeId: reviewer1.employee.id,
				expectedVersion: addSecond.data.version,
			},
			ready,
		);
		expect(firstSubmit.ok).toBe(true);
		if (!firstSubmit.ok) return;

		const blockedFinalize = await finalizeReview(
			ready,
			firstSubmit.data,
			"idem-delegated-blocked",
		);
		expect(blockedFinalize.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blockedFinalize)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);

		const secondSubmit = await submitDelegatedAssessment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-second",
				reviewId: firstSubmit.data.id,
				participantId: delegatedParticipants[1]?.id,
				rating: "exceeds",
				commentsSensitive: "Second reviewer confidential",
				delegatedEmployeeId: reviewer2.employee.id,
				expectedVersion: firstSubmit.data.version,
			},
			ready,
		);
		expect(secondSubmit.ok).toBe(true);
		if (!secondSubmit.ok) return;

		const acknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-delegated-ack",
				reviewId: secondSubmit.data.id,
				acknowledgementNote: "Acknowledged after delegated chain",
				expectedVersion: secondSubmit.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;

		const finalized = await finalizeReview(
			ready,
			acknowledged.data,
			"idem-delegated-finalize",
		);
		expect(finalized.ok).toBe(true);
	});

	it("calibrates overall rating and requires matching finalize rating", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "calibration",
		});

		const calibrated = await calibratePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-calibrate",
				reviewId: seeded.review.id,
				overallRating: "meets",
				calibrationNote: "Committee adjusted to meets",
				expectedVersion: seeded.review.version,
			},
			ready,
		);
		expect(calibrated.ok).toBe(true);
		if (!calibrated.ok) return;
		expect(calibrated.data.overallRating).toBe("meets");
		expect(calibrated.data.calibrationNote).toContain("Committee");

		const mismatch = await finalizePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-calibrate-mismatch",
				reviewId: calibrated.data.id,
				overallRating: "exceeds",
				idempotencyKey: "idem-calibrate-mismatch",
				expectedVersion: calibrated.data.version,
			},
			ready,
		);
		expect(mismatch.ok).toBe(false);
		expect(humanResourcesCodeFromResult(mismatch)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);

		const acknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-calibrate-ack",
				reviewId: calibrated.data.id,
				acknowledgementNote: null,
				expectedVersion: calibrated.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;

		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-calibrate-finalize",
				reviewId: acknowledged.data.id,
				overallRating: "meets",
				idempotencyKey: "idem-calibrate-finalize",
				expectedVersion: acknowledged.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;
		expect(finalized.data.status).toBe("finalized");
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
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-pip-finalize",
		);
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

describe("Performance improvement plan — Slice 9.5 lifecycle", () => {
	it("runs full milestone lifecycle with objectives, extension, evidence, and completion", async () => {
		const ready = harness();
		const ports = createMemoryMutationPorts();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "pip-95",
		});
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-pip-95-finalize",
		);
		if (!finalized.ok) throw new Error(finalized.code);

		const plan = await createImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-create",
				idempotencyKey: "idem-pip-95-create",
				reviewId: finalized.data.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				performanceGap: "Missed targets",
				expectedOutcome: "Meet Q3 targets",
				measurableActions: "Weekly check-ins",
				supportResources: "Coaching",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: seeded.manager.employee.id,
				milestones: [
					{ dueDate: "2025-07-31" },
					{ dueDate: "2025-08-31" },
					{ dueDate: "2025-09-30" },
				],
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;
		expect(plan.data.status).toBe("draft");

		const checkpoints = await listImprovementPlanCheckpoints(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-list-checkpoints",
				planId: plan.data.id,
			},
			ready,
		);
		expect(checkpoints.ok).toBe(true);
		if (!checkpoints.ok) return;
		expect(checkpoints.data.checkpoints).toHaveLength(3);
		expect(
			checkpoints.data.checkpoints.every(
				(checkpoint) => checkpoint.outcome === "pending",
			),
		).toBe(true);

		const opened = await openImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-open",
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

		const active = await listActiveImprovementPlans(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-list-active",
			},
			ready,
		);
		expect(active.ok).toBe(true);
		if (!active.ok) return;
		expect(active.data.plans.some((row) => row.id === opened.data.id)).toBe(
			true,
		);

		const amended = await amendImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-amend-objectives",
				planId: opened.data.id,
				expectedVersion: opened.data.version,
				performanceGap: "Revised gap",
				expectedOutcome: "Revised outcome",
			},
			ready,
		);
		expect(amended.ok).toBe(true);
		if (!amended.ok) return;
		expect(amended.data.performanceGap).toBe("Revised gap");
		expect(amended.data.expectedOutcome).toBe("Revised outcome");

		const checkpoint1 = await recordImprovementCheckpoint(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-checkpoint-1",
				planId: amended.data.id,
				sequenceNumber: 1,
				outcome: "met",
				notes: "First milestone met",
				evidenceReference: "doc://pip-95/milestone-1",
			},
			ready,
		);
		expect(checkpoint1.ok).toBe(true);
		if (!checkpoint1.ok) return;
		expect(checkpoint1.data.evidenceReference).toBe("doc://pip-95/milestone-1");

		const extended = await amendImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-extend",
				planId: amended.data.id,
				expectedVersion: amended.data.version,
				dueDate: "2025-10-31",
				extensionReason: "Additional coaching time required",
				extensionEvidenceReference: "doc://pip-95/extension",
			},
			ready,
		);
		expect(extended.ok).toBe(true);
		if (!extended.ok) return;
		expect(extended.data.dueDate).toBe("2025-10-31");
		expect(extended.data.lastExtensionReason).toBe(
			"Additional coaching time required",
		);
		expect(extended.data.lastExtensionEvidenceReference).toBe(
			"doc://pip-95/extension",
		);

		const afterExtend = await listImprovementPlanCheckpoints(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-list-after-extend",
				planId: extended.data.id,
			},
			ready,
		);
		expect(afterExtend.ok).toBe(true);
		if (!afterExtend.ok) return;
		expect(afterExtend.data.checkpoints).toHaveLength(4);
		expect(afterExtend.data.checkpoints[3]?.sequenceNumber).toBe(4);
		expect(afterExtend.data.checkpoints[3]?.outcome).toBe("pending");

		for (const sequenceNumber of [2, 3, 4]) {
			const recorded = await recordImprovementCheckpoint(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-pip-95-checkpoint-${sequenceNumber}`,
					planId: extended.data.id,
					sequenceNumber,
					outcome: "met",
					notes: `Milestone ${sequenceNumber} met`,
				},
				ready,
			);
			expect(recorded.ok).toBe(true);
		}

		const acknowledged = await acknowledgeImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-ack",
				planId: extended.data.id,
				expectedVersion: extended.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;

		const completed = await completeImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-complete",
				planId: acknowledged.data.id,
				expectedVersion: acknowledged.data.version,
				outcomeReason: "All milestones met",
				outcomeEvidenceReference: "doc://pip-95/completion",
			},
			{ ...ready, ports },
		);
		expect(completed.ok).toBe(true);
		if (!completed.ok) return;
		expect(completed.data.status).toBe("completed");
		expect(completed.data.outcomeReason).toBe("All milestones met");
		expect(completed.data.outcomeEvidenceReference).toBe(
			"doc://pip-95/completion",
		);
		expect(ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
			}),
		);
	});

	it("closes plan as unsuccessful when a milestone is missed", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "pip-95-fail",
		});
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-pip-95-fail-finalize",
		);
		if (!finalized.ok) throw new Error(finalized.code);

		const plan = await createImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-create",
				idempotencyKey: "idem-pip-95-fail-create",
				reviewId: finalized.data.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				performanceGap: "Missed targets",
				expectedOutcome: "Meet Q3 targets",
				measurableActions: "Weekly check-ins",
				supportResources: "Coaching",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: seeded.manager.employee.id,
				milestones: [{ dueDate: "2025-07-31" }, { dueDate: "2025-09-30" }],
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const opened = await openImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-open",
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const missed = await recordImprovementCheckpoint(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-checkpoint-1",
				planId: opened.data.id,
				sequenceNumber: 1,
				outcome: "missed",
				notes: "First milestone missed",
			},
			ready,
		);
		expect(missed.ok).toBe(true);
		if (!missed.ok) return;

		const reviewed = await recordImprovementCheckpoint(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-checkpoint-2",
				planId: opened.data.id,
				sequenceNumber: 2,
				outcome: "met",
				notes: "Second milestone met",
			},
			ready,
		);
		expect(reviewed.ok).toBe(true);
		if (!reviewed.ok) return;

		const acknowledged = await acknowledgeImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-ack",
				planId: opened.data.id,
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) return;

		const closed = await closeImprovementPlanUnsuccessful(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-fail-close",
				planId: acknowledged.data.id,
				expectedVersion: acknowledged.data.version,
				outcomeReason: "Milestone 1 missed",
				outcomeEvidenceReference: "doc://pip-95/failure",
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;
		expect(closed.data.status).toBe("unsuccessful");
		expect(closed.data.outcomeReason).toBe("Milestone 1 missed");
	});

	it("rejects completion while checkpoints remain pending", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "pip-95-pending",
		});
		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-pip-95-pending-finalize",
		);
		if (!finalized.ok) throw new Error(finalized.code);

		const plan = await createImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-pending-create",
				idempotencyKey: "idem-pip-95-pending-create",
				reviewId: finalized.data.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				performanceGap: "Missed targets",
				expectedOutcome: "Meet Q3 targets",
				measurableActions: "Weekly check-ins",
				supportResources: "Coaching",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: seeded.manager.employee.id,
				milestones: [{ dueDate: "2025-07-31" }, { dueDate: "2025-09-30" }],
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const opened = await openImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-pending-open",
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const completed = await completeImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-pip-95-pending-complete",
				planId: opened.data.id,
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(completed.ok).toBe(false);
		expect(humanResourcesCodeFromResult(completed)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});
});

describe("Employee performance history", () => {
	it("aggregates reviews, cycle goals, and PIPs with confidentiality controls", async () => {
		const ready = harness();
		const seeded = await seedReviewAtManagerSubmitted(ready, {
			organizationId: ORG_A,
			suffix: "history",
			weightingModel: "percent100",
		});

		const goal = await createPerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-goal",
				idempotencyKey: "idem-history-goal",
				cycleId: seeded.cycle.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				goalKind: "employee",
				title: "History goal",
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
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-goal-submit",
				goalId: goal.data.id,
				expectedVersion: goal.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) return;

		const approved = await approvePerformanceGoal(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-goal-approve",
				goalId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;

		const finalized = await finalizeReview(
			ready,
			seeded.review,
			"idem-history-finalize",
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;

		const plan = await createImprovementPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-pip",
				idempotencyKey: "idem-history-pip",
				reviewId: finalized.data.id,
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				performanceGap: "Below expectations",
				expectedOutcome: "Meet baseline",
				measurableActions: "Weekly 1:1",
				supportResources: "Mentor",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: seeded.manager.employee.id,
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const redacted = await getEmployeePerformanceHistory(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-redacted",
				employeeId: seeded.employee.id,
				includeConfidential: false,
			},
			ready,
		);
		expect(redacted.ok).toBe(true);
		if (!redacted.ok) return;
		expect(redacted.data.employeeId).toBe(seeded.employee.id);
		expect(redacted.data.entries.length).toBeGreaterThanOrEqual(1);

		const entry = redacted.data.entries.find(
			(historyEntry) => historyEntry.review.id === finalized.data.id,
		);
		expect(entry).toBeDefined();
		if (!entry) return;
		expect(
			entry.goals.some((cycleGoal) => cycleGoal.id === approved.data.id),
		).toBe(true);
		expect(entry.improvementPlans.some((pip) => pip.id === plan.data.id)).toBe(
			true,
		);
		expect(entry.overallRating).toBeNull();
		expect(
			entry.assessments.every((assessment) => assessment.rating === null),
		).toBe(true);

		const confidential = await getEmployeePerformanceHistory(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-confidential",
				employeeId: seeded.employee.id,
				includeConfidential: true,
			},
			ready,
		);
		expect(confidential.ok).toBe(true);
		if (!confidential.ok) return;
		const confidentialEntry = confidential.data.entries.find(
			(historyEntry) => historyEntry.review.id === finalized.data.id,
		);
		expect(confidentialEntry?.overallRating).toBe("meets");
		expect(
			confidentialEntry?.assessments.some(
				(assessment) => assessment.rating !== null,
			),
		).toBe(true);

		const ownReadReady = createTestHumanResourcesCommandOptions({
			store: ready.store,
			ports: ready.ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			]),
			identityResolver: ready.identityResolver,
		});

		const blocked = await getEmployeePerformanceHistory(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-history-blocked",
				employeeId: seeded.employee.id,
				includeConfidential: true,
			},
			ownReadReady,
		);
		expect(blocked.ok).toBe(false);
		expect(humanResourcesCodeFromResult(blocked)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
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

		const published = await publishPerformanceCycleReady(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationIdPrefix: "corr-stale",
			cycle: created.data,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) return;

		const stale = await openPerformanceCycle(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-open",
				cycleId: published.data.id,
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
