/**
 * Lifecycle transition matrix (HR-05 / roadmap HR6).
 */

import {
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { amendEmployment, createEmployment } from "../src/core/employment";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { confirmEmployment } from "../src/lifecycle/confirmation";
import {
	completeOffboarding,
	completeOffboardingTask,
	getClearanceByOffboardingCase,
	listOffboardingTasks,
	recordClearance,
	recordExitInterview,
	startOffboarding,
} from "../src/lifecycle/offboarding";
import {
	completeOnboarding,
	completeOnboardingTask,
	listOnboardingTasks,
	startOnboarding,
} from "../src/lifecycle/onboarding";
import {
	extendProbation,
	openProbation,
	recordProbationOutcome,
} from "../src/lifecycle/probation";
import { finalizeTermination } from "../src/lifecycle/termination";
import { transferAssignment } from "../src/lifecycle/transfer";
import { createPosition, freezePosition } from "../src/organization/position";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
} from "../src/permissions";
import {
	createMemoryHumanResourcesStore,
	createMemoryOrganizationDimensionDirectory,
} from "../src/testing";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG_A = "org-life-a";
const ORG_B = "org-life-b";
const ACTOR = "user-life-1";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
	ports = createMemoryMutationPorts(),
) {
	const store = createMemoryHumanResourcesStore();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return {
		store,
		ports,
		authorization,
		organizationDimensions: createMemoryOrganizationDimensionDirectory(),
	};
}

async function seedActiveEmployment(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		suffix: string;
		startsOn?: string;
	},
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
	if (!employee.ok) return employee;

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-employment-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: input.startsOn ?? "2025-01-01",
		},
		ready,
	);
	if (!employment.ok) return employment;

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

async function seedEmploymentWithAssignment(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; suffix: string },
) {
	const seeded = await seedActiveEmployment(ready, input);
	if (!seeded.ok) return seeded;

	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: ACTOR,
		correlationId: `corr-org-${input.suffix}`,
	});
	if (orgSeed === null) {
		throw new Error("Failed to seed department/job");
	}

	const positionA = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-pos-a-${input.suffix}`,
			code: `PA-${input.suffix}`.slice(0, 64),
			title: "Role A",
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!positionA.ok) return positionA;

	const positionB = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-pos-b-${input.suffix}`,
			code: `PB-${input.suffix}`.slice(0, 64),
			title: "Role B",
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!positionB.ok) return positionB;

	const assignment = await createAssignment(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-asg-${input.suffix}`,
			employmentId: seeded.employment.id,
			positionId: positionA.data.id,
			...TEST_ORGANIZATION_DIMENSION_KEYS,
			startsOn: "2025-01-01",
		},
		ready,
	);
	if (!assignment.ok) return assignment;

	return {
		ok: true as const,
		employee: seeded.employee,
		employment: seeded.employment,
		positionA: positionA.data,
		positionB: positionB.data,
		assignment: assignment.data,
	};
}

async function completeOnboardingPath(
	ready: ReturnType<typeof harness>,
	input: {
		organizationId: string;
		employmentId: string;
		suffix: string;
		sourceOfferId?: string | null;
	},
) {
	const started = await startOnboarding(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-onb-start-${input.suffix}`,
			idempotencyKey: `idem-onb-${input.suffix}`,
			employmentId: input.employmentId,
			sourceOfferId: input.sourceOfferId,
			tasks: [
				{
					code: "identity_documents",
					title: "Identity documents",
					mandatory: true,
				},
			],
		},
		ready,
	);
	if (!started.ok) return started;

	const tasks = await listOnboardingTasks(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-onb-tasks-${input.suffix}`,
			onboardingCaseId: started.data.id,
		},
		ready,
	);
	if (!tasks.ok) return tasks;
	const task = tasks.data[0];
	if (!task) {
		throw new Error("Expected seeded onboarding task");
	}

	const completedTask = await completeOnboardingTask(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-onb-task-${input.suffix}`,
			taskId: task.id,
			status: "completed",
			expectedVersion: task.version,
		},
		ready,
	);
	if (!completedTask.ok) return completedTask;

	return completeOnboarding(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-onb-complete-${input.suffix}`,
			onboardingCaseId: started.data.id,
			expectedVersion: started.data.version,
		},
		ready,
	);
}

describe("human-resources lifecycle", () => {
	it("runs the full valid transition path with handoff events", async () => {
		const ready = harness();
		const seeded = await seedEmploymentWithAssignment(ready, {
			organizationId: ORG_A,
			suffix: "happy",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const onboarding = await completeOnboardingPath(ready, {
			organizationId: ORG_A,
			employmentId: seeded.employment.id,
			suffix: "happy",
		});
		expect(onboarding.ok).toBe(true);
		if (!onboarding.ok) return;
		expect(onboarding.data.status).toBe("completed");

		const probation = await openProbation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-open",
				idempotencyKey: "idem-prob-happy",
				employmentId: seeded.employment.id,
				startsOn: "2025-01-01",
				endsOn: "2025-04-01",
			},
			ready,
		);
		expect(probation.ok).toBe(true);
		if (!probation.ok) return;

		const outcome = await recordProbationOutcome(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-outcome",
				probationReviewId: probation.data.id,
				outcome: "passed",
				outcomeRecordedOn: "2025-03-15",
				expectedVersion: probation.data.version,
			},
			ready,
		);
		expect(outcome.ok).toBe(true);

		const confirmation = await confirmEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-confirm",
				idempotencyKey: "idem-confirm-happy",
				employmentId: seeded.employment.id,
				confirmedOn: "2025-03-16",
				evidenceNote: "Probation passed with evidence",
			},
			ready,
		);
		expect(confirmation.ok).toBe(true);
		if (!confirmation.ok) return;

		const employmentAfterConfirm = await ready.store.getEmploymentById({
			organizationId: ORG_A,
			employmentId: seeded.employment.id,
		});
		expect(employmentAfterConfirm.ok).toBe(true);
		if (employmentAfterConfirm.ok && employmentAfterConfirm.data) {
			expect(employmentAfterConfirm.data.status).toBe("active");
			expect(employmentAfterConfirm.data.version).toBe(
				seeded.employment.version,
			);
		}

		const transfer = await transferAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-transfer",
				idempotencyKey: "idem-transfer-happy",
				employmentId: seeded.employment.id,
				toPositionId: seeded.positionB.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				effectiveOn: "2025-05-01",
				reason: "Org restructure",
			},
			ready,
		);
		expect(transfer.ok).toBe(true);
		if (!transfer.ok) return;
		expect(transfer.data.toPositionId).toBe(seeded.positionB.id);

		const termination = await finalizeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term",
				idempotencyKey: "idem-term-happy",
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Voluntary resignation",
				effectiveOn: "2025-06-01",
			},
			ready,
		);
		expect(termination.ok).toBe(true);
		if (!termination.ok) return;
		expect(termination.data.status).toBe("finalized");

		const employmentAfterTerm = await ready.store.getEmploymentById({
			organizationId: ORG_A,
			employmentId: seeded.employment.id,
		});
		expect(employmentAfterTerm.ok).toBe(true);
		if (employmentAfterTerm.ok && employmentAfterTerm.data) {
			expect(employmentAfterTerm.data.status).toBe("terminated");
			expect(employmentAfterTerm.data.endsOn).toBe("2025-06-01");
		}

		const offboarding = await startOffboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-start",
				idempotencyKey: "idem-off-happy",
				employmentId: seeded.employment.id,
				terminationId: termination.data.id,
				tasks: [
					{ code: "return_badge", title: "Return badge", mandatory: true },
				],
			},
			ready,
		);
		expect(offboarding.ok).toBe(true);
		if (!offboarding.ok) return;

		const offTasks = await listOffboardingTasks(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-tasks",
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(offTasks.ok).toBe(true);
		if (!offTasks.ok) return;
		const offTask = offTasks.data[0];
		expect(offTask).toBeDefined();
		if (!offTask) return;

		const offTaskDone = await completeOffboardingTask(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-task",
				taskId: offTask.id,
				status: "completed",
				expectedVersion: offTask.version,
			},
			ready,
		);
		expect(offTaskDone.ok).toBe(true);

		const exit = await recordExitInterview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-exit",
				offboardingCaseId: offboarding.data.id,
				conductedOn: "2025-06-02",
				notes: "Exit interview completed",
			},
			ready,
		);
		expect(exit.ok).toBe(true);

		const clearance = await getClearanceByOffboardingCase(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-clearance-get",
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(clearance.ok).toBe(true);
		if (!clearance.ok || !clearance.data) return;

		const cleared = await recordClearance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-clearance",
				clearanceId: clearance.data.id,
				clearedOn: "2025-06-03",
				expectedVersion: clearance.data.version,
			},
			ready,
		);
		expect(cleared.ok).toBe(true);

		const completedOffboarding = await completeOffboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-complete",
				offboardingCaseId: offboarding.data.id,
				expectedVersion: offboarding.data.version,
			},
			ready,
		);
		expect(completedOffboarding.ok).toBe(true);
		if (!completedOffboarding.ok) return;
		expect(completedOffboarding.data.status).toBe("completed");

		const eventTypes = ready.ports.outbox.calls.map((call) => call.type);
		expect(eventTypes).toContain(HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT);

		expect(JSON.stringify(ready.ports.outbox.calls)).not.toMatch(/payroll_/i);
		expect(JSON.stringify(ready.ports.audit.calls)).not.toMatch(/neon_auth/i);
	});

	it("rejects invalid onboarding and incomplete completion", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "bad-onb",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-notice",
				employmentId: seeded.employment.id,
				status: "notice",
				expectedVersion: seeded.employment.version,
			},
			ready,
		);

		const noticeOnboard = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-onb-notice",
				idempotencyKey: "idem-onb-notice",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(noticeOnboard.ok).toBe(false);
		if (!noticeOnboard.ok) {
			expect(humanResourcesCodeFromResult(noticeOnboard)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}

		const active = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "bad-onb-2",
		});
		expect(active.ok).toBe(true);
		if (!active.ok) return;

		const started = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-onb-open",
				idempotencyKey: "idem-onb-open",
				employmentId: active.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(started.ok).toBe(true);
		if (!started.ok) return;

		const earlyComplete = await completeOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-onb-early",
				onboardingCaseId: started.data.id,
				expectedVersion: started.data.version,
			},
			ready,
		);
		expect(earlyComplete.ok).toBe(false);
		if (!earlyComplete.ok) {
			expect(humanResourcesCodeFromResult(earlyComplete)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("prevents duplicate active onboarding and offboarding", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "dup-onb",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const first = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-1",
				idempotencyKey: "idem-dup-1",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-2",
				idempotencyKey: "idem-dup-2",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs2", title: "Docs 2", mandatory: true }],
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const withAssignment = await seedEmploymentWithAssignment(ready, {
			organizationId: ORG_A,
			suffix: "dup-off",
		});
		expect(withAssignment.ok).toBe(true);
		if (!withAssignment.ok) return;

		const term = await finalizeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-term",
				idempotencyKey: "idem-dup-term",
				employmentId: withAssignment.employment.id,
				reasonCode: "layoff",
				reasonDetail: "Reduction",
				effectiveOn: "2025-07-01",
			},
			ready,
		);
		expect(term.ok).toBe(true);
		if (!term.ok) return;

		const off1 = await startOffboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-off-1",
				idempotencyKey: "idem-dup-off-1",
				employmentId: withAssignment.employment.id,
				terminationId: term.data.id,
				tasks: [{ code: "badge", title: "Badge", mandatory: true }],
			},
			ready,
		);
		expect(off1.ok).toBe(true);

		const off2 = await startOffboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-off-2",
				idempotencyKey: "idem-dup-off-2",
				employmentId: withAssignment.employment.id,
				terminationId: term.data.id,
				tasks: [{ code: "badge2", title: "Badge 2", mandatory: true }],
			},
			ready,
		);
		expect(off2.ok).toBe(false);
		if (!off2.ok) {
			expect(humanResourcesCodeFromResult(off2)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects overlapping probation and invalid extension", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "prob-overlap",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const first = await openProbation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-1",
				idempotencyKey: "idem-prob-1",
				employmentId: seeded.employment.id,
				startsOn: "2025-01-01",
				endsOn: "2025-03-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const overlap = await openProbation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-2",
				idempotencyKey: "idem-prob-2",
				employmentId: seeded.employment.id,
				startsOn: "2025-02-01",
				endsOn: "2025-04-01",
			},
			ready,
		);
		expect(overlap.ok).toBe(false);
		if (!overlap.ok) {
			expect(humanResourcesCodeFromResult(overlap)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const badExtend = await extendProbation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-ext",
				probationReviewId: first.data.id,
				newEndsOn: "2025-02-15",
				expectedVersion: first.data.version,
			},
			ready,
		);
		expect(badExtend.ok).toBe(false);
	});

	it("rejects transfer to same/invalid target and frozen position", async () => {
		const ready = harness();
		const seeded = await seedEmploymentWithAssignment(ready, {
			organizationId: ORG_A,
			suffix: "xfer-bad",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const same = await transferAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xfer-same",
				idempotencyKey: "idem-xfer-same",
				employmentId: seeded.employment.id,
				toPositionId: seeded.positionA.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				effectiveOn: "2025-05-01",
				reason: "noop",
			},
			ready,
		);
		expect(same.ok).toBe(false);

		const orgSeed = await seedDepartmentAndJob(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
		});
		expect(orgSeed).not.toBeNull();
		if (!orgSeed) return;

		const target = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-frozen",
				code: "PF-xfer-bad",
				title: "Frozen role",
				departmentId: orgSeed.departmentId,
				jobId: orgSeed.jobId,
			},
			ready,
		);
		expect(target.ok).toBe(true);
		if (!target.ok) return;

		const frozen = await freezePosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-freeze",
				positionId: target.data.id,
				expectedVersion: target.data.version,
			},
			ready,
		);
		expect(frozen.ok).toBe(true);
		if (!frozen.ok) return;

		const toFrozen = await transferAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-xfer-frozen",
				idempotencyKey: "idem-xfer-frozen",
				employmentId: seeded.employment.id,
				toPositionId: frozen.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				effectiveOn: "2025-05-01",
				reason: "bad target",
			},
			ready,
		);
		expect(toFrozen.ok).toBe(false);
	});

	it("rejects termination before start and duplicate finalized termination", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "term-bad",
			startsOn: "2025-06-01",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const beforeStart = await finalizeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-before",
				idempotencyKey: "idem-term-before",
				employmentId: seeded.employment.id,
				reasonCode: "error",
				reasonDetail: "Too early",
				effectiveOn: "2025-05-01",
			},
			ready,
		);
		expect(beforeStart.ok).toBe(false);

		const first = await finalizeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-ok",
				idempotencyKey: "idem-term-ok",
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Leaving",
				effectiveOn: "2025-07-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await finalizeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-dup",
				idempotencyKey: "idem-term-dup",
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Leaving again",
				effectiveOn: "2025-07-02",
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects offboarding while employment is still active without termination", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "off-active",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const result = await startOffboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-off-active",
				idempotencyKey: "idem-off-active",
				employmentId: seeded.employment.id,
				tasks: [{ code: "badge", title: "Badge", mandatory: true }],
			},
			ready,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("rejects stale expectedVersion on onboarding task completion", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "stale",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const started = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-start",
				idempotencyKey: "idem-stale",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(started.ok).toBe(true);
		if (!started.ok) return;

		const tasks = await listOnboardingTasks(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-tasks",
				onboardingCaseId: started.data.id,
			},
			ready,
		);
		expect(tasks.ok).toBe(true);
		if (!tasks.ok) return;
		const task = tasks.data[0];
		if (!task) return;

		const stale = await completeOnboardingTask(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale-task",
				taskId: task.id,
				status: "completed",
				expectedVersion: task.version + 5,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}
	});

	it("rejects cross-org employment references", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "xorg",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const result = await startOnboarding(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-xorg",
				idempotencyKey: "idem-xorg",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	});

	it("replays repeated idempotency key and conflicts on payload change", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "idem",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const first = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-1",
				idempotencyKey: "idem-shared",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const replay = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-2",
				idempotencyKey: "idem-shared",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		expect(replay.data.id).toBe(first.data.id);

		const otherEmployment = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "idem-b",
		});
		expect(otherEmployment.ok).toBe(true);
		if (!otherEmployment.ok) return;

		const conflict = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-idem-3",
				idempotencyKey: "idem-shared",
				employmentId: otherEmployment.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			ready,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(humanResourcesCodeFromResult(conflict)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rolls back onboarding when outbox fails mid-transaction", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "rollback",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const portsFail = createMemoryMutationPorts({ outboxFailAfter: 0 });
		const readyFail = {
			store: ready.store,
			ports: portsFail,
			authorization: ready.authorization,
		};

		const result = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-rollback",
				idempotencyKey: "idem-rollback",
				employmentId: seeded.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			readyFail,
		);
		expect(result.ok).toBe(false);

		const openCases = await ready.store.findOnboardingByStartIdempotencyKey({
			organizationId: ORG_A,
			idempotencyKey: "idem-rollback",
		});
		expect(openCases.ok).toBe(true);
		if (openCases.ok) {
			expect(openCases.data).toBeNull();
		}
	});

	it("forbids onboarding without onboarding.manage permission", async () => {
		const full = harness();
		const active = await seedActiveEmployment(full, {
			organizationId: ORG_A,
			suffix: "forbid",
		});
		expect(active.ok).toBe(true);
		if (!active.ok) return;

		const restricted = {
			store: full.store,
			ports: full.ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			]),
		};
		const result = await startOnboarding(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-forbid",
				idempotencyKey: "idem-forbid",
				employmentId: active.employment.id,
				tasks: [{ code: "docs", title: "Docs", mandatory: true }],
			},
			restricted,
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(humanResourcesCodeFromResult(result)).toBe(
				HUMAN_RESOURCES_ERROR_FORBIDDEN,
			);
		}
	});

	it("does not import auth or payroll packages from lifecycle modules", async () => {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const lifecycleDir = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
			"src",
			"lifecycle",
		);
		const files = await fs.readdir(lifecycleDir);
		for (const file of files) {
			if (!file.endsWith(".ts")) continue;
			const body = await fs.readFile(path.join(lifecycleDir, file), "utf8");
			expect(body).not.toMatch(/@afenda\/auth/);
			expect(body).not.toMatch(/@afenda\/payroll/);
			expect(body).not.toMatch(/@afenda\/admin/);
		}
	});
});
