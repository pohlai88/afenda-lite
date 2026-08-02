import {
	createPerformanceGoal,
	submitPerformanceGoal,
} from "../../src/features/performance/goal";
import {
	createPerformanceCycle,
	listCycleParticipants,
} from "../../src/features/performance/performance-cycle";
import {
	startPerformanceReview,
	submitManagerAssessment,
	submitSelfAssessment,
} from "../../src/features/performance/review";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
} from "../../src/kernel/authorization/permissions";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import { helperAssert as assert } from "./helper-assert";
import { mapActorToEmployee } from "./identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { publishAndOpenPerformanceCycle } from "./performance-cycle-harness";

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
	assert.strictEqual(employee.ok, true);
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
	assert.strictEqual(employment.ok, true);
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
	assert.strictEqual(cycle.ok, true);
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
	assert.strictEqual(opened.ok, true);
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
	assert.strictEqual(participants.ok, true);
	if (!participants.ok) {
		throw participants.error;
	}
	const [participant] = participants.data;
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
	assert.strictEqual(goal.ok, true);
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
	assert.strictEqual(submitted.ok, true);
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
	assert.strictEqual(review.ok, true);
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
	assert.strictEqual(self.ok, true);
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
	assert.strictEqual(managerAssessment.ok, true);
	if (!managerAssessment.ok) {
		throw managerAssessment.error;
	}

	return managerAssessment.data;
}
