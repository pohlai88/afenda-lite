import { expect } from "vitest";

import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import {
	createPerformanceGoal,
	submitPerformanceGoal,
} from "../../src/performance/goal";
import {
	createPerformanceCycle,
	listCycleParticipants,
} from "../../src/performance/performance-cycle";
import { publishAndOpenPerformanceCycle } from "./performance-cycle-harness";
import {
	startPerformanceReview,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../../src/performance/review";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
} from "../../src/permissions";
import { mapActorToEmployee } from "./identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";

const RATING_SCALE = { codes: ["meets", "exceeds"] } as const;

export async function seedPerformanceCorrelationWorker(input: {
	organizationId: string;
	actorUserId: string;
	ready: HumanResourcesCommandOptions & {
		store: NonNullable<HumanResourcesCommandOptions["store"]>;
	};
	suffix: string;
}) {
	const perfReady = {
		...input.ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
			HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
			HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
		]),
	};

	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-corr-emp-${input.suffix}`,
			idempotencyKey: `idem-perf-corr-emp-${input.suffix}`,
			employeeNumber: `E-PERF-CORR-${input.suffix}`,
			legalName: `Perf Corr ${input.suffix}`,
		},
		perfReady,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) {
		throw employee.error;
	}

	await mapActorToEmployee(input.ready.store, {
		organizationId: input.organizationId,
		userId: input.actorUserId,
		employeeId: employee.data.id,
		actorUserId: input.actorUserId,
		effectiveFrom: "2025-01-01",
	});

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-corr-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		perfReady,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) {
		throw employment.error;
	}

	return {
		employee: employee.data,
		employment: employment.data,
		perfReady,
	};
}

export async function seedDraftPerformanceCycle(input: {
	organizationId: string;
	actorUserId: string;
	perfReady: HumanResourcesCommandOptions;
	suffix: string;
}) {
	const cycle = await createPerformanceCycle(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-cycle-${input.suffix}`,
			idempotencyKey: `idem-perf-cycle-${input.suffix}`,
			code: `PERF-CORR-${input.suffix}`,
			name: "Performance Correlation Cycle",
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
			ratingScale: RATING_SCALE,
			weightingModel: "percent100",
		},
		input.perfReady,
	);
	expect(cycle.ok).toBe(true);
	if (!cycle.ok) {
		throw cycle.error;
	}
	return cycle.data;
}

export async function seedOpenPerformanceCycleWithParticipant(input: {
	organizationId: string;
	actorUserId: string;
	perfReady: HumanResourcesCommandOptions;
	worker: { employeeId: string; employmentId: string };
	suffix: string;
}) {
	const draft = await seedDraftPerformanceCycle(input);
	const opened = await publishAndOpenPerformanceCycle(input.perfReady, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationIdPrefix: `corr-perf-open-seed-${input.suffix}`,
		cycle: draft,
		participant: {
			employeeId: input.worker.employeeId,
			employmentId: input.worker.employmentId,
		},
	});
	expect(opened.ok).toBe(true);
	if (!opened.ok) {
		throw opened.error;
	}

	const participants = await listCycleParticipants(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-part-list-${input.suffix}`,
			cycleId: opened.data.id,
		},
		input.perfReady,
	);
	expect(participants.ok).toBe(true);
	if (!participants.ok) {
		throw participants.error;
	}
	const participant = participants.data[0];
	if (!participant) {
		throw new Error("Expected cycle participant after open");
	}

	return { cycle: opened.data, participant };
}

export async function seedSubmittedPerformanceGoal(input: {
	organizationId: string;
	actorUserId: string;
	perfReady: HumanResourcesCommandOptions;
	cycleId: string;
	employeeId: string;
	employmentId: string;
	suffix: string;
}) {
	const goal = await createPerformanceGoal(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-goal-${input.suffix}`,
			idempotencyKey: `idem-perf-goal-${input.suffix}`,
			cycleId: input.cycleId,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			goalKind: "employee",
			title: "Correlation goal",
			weight: "100",
			periodStart: "2025-01-01",
			periodEnd: "2025-12-31",
		},
		input.perfReady,
	);
	expect(goal.ok).toBe(true);
	if (!goal.ok) {
		throw goal.error;
	}

	const submitted = await submitPerformanceGoal(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-goal-submit-${input.suffix}`,
			goalId: goal.data.id,
			expectedVersion: goal.data.version,
		},
		input.perfReady,
	);
	expect(submitted.ok).toBe(true);
	if (!submitted.ok) {
		throw submitted.error;
	}

	return submitted.data;
}

export async function seedManagerSubmittedPerformanceReview(input: {
	organizationId: string;
	actorUserId: string;
	perfReady: HumanResourcesCommandOptions;
	cycleId: string;
	employeeId: string;
	employmentId: string;
	managerEmployeeId: string;
	suffix: string;
}) {
	const review = await startPerformanceReview(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-review-${input.suffix}`,
			cycleId: input.cycleId,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			managerEmployeeId: input.managerEmployeeId,
		},
		input.perfReady,
	);
	expect(review.ok).toBe(true);
	if (!review.ok) {
		throw review.error;
	}

	const self = await submitSelfAssessment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-self-${input.suffix}`,
			reviewId: review.data.id,
			rating: "meets",
			actorEmployeeId: input.employeeId,
			expectedVersion: review.data.version,
		},
		input.perfReady,
	);
	expect(self.ok).toBe(true);
	if (!self.ok) {
		throw self.error;
	}

	const managerAssessment = await submitManagerAssessment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-perf-mgr-${input.suffix}`,
			reviewId: self.data.id,
			rating: "exceeds",
			managerEmployeeId: input.managerEmployeeId,
			expectedVersion: self.data.version,
		},
		input.perfReady,
	);
	expect(managerAssessment.ok).toBe(true);
	if (!managerAssessment.ok) {
		throw managerAssessment.error;
	}

	return managerAssessment.data;
}
