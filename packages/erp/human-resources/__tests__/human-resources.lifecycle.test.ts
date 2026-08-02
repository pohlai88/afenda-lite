/**
 * Lifecycle transition matrix (HR-05 / roadmap HR6).
 */

import {
	HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
	HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
	HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import { confirmEmployment } from "../src/features/employment-lifecycle/confirmation";
import {
	completeOffboarding,
	completeOffboardingTask,
	getClearanceByOffboardingCase,
	getOffboardingAccessRevocationByCase,
	getOffboardingPayrollHandoffByCase,
	listOffboardingTasks,
	recordClearance,
	recordExitInterview,
	recordOffboardingAccessRevocation,
	recordOffboardingPayrollHandoff,
	startOffboarding,
} from "../src/features/employment-lifecycle/offboarding";
import {
	completeOnboarding,
	completeOnboardingTask,
	listOnboardingTasks,
	startOnboarding,
} from "../src/features/employment-lifecycle/onboarding";
import {
	GOVERNED_ONBOARDING_CHECKLIST,
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_ORIENTATION,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "../src/features/employment-lifecycle/onboarding-checklist";
import {
	extendProbation,
	listProbationAssessments,
	listProbationReviewsByEmployment,
	openProbation,
	recordProbationAssessment,
	recordProbationOutcome,
} from "../src/features/employment-lifecycle/probation";
import {
	approveTermination,
	finalizeTermination,
	proposeTermination,
} from "../src/features/employment-lifecycle/termination";
import { transferAssignment } from "../src/features/employment-lifecycle/transfer";
import {
	createPosition,
	freezePosition,
} from "../src/features/organization/position";
import {
	assignPrimaryReportingLine,
	replacePrimaryReportingLine,
} from "../src/features/organization/reporting-line";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
	endWorkCalendarAssignment,
} from "../src/features/time/calendar";
import { createAssignment } from "../src/features/workforce-records/employment/assignment";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import {
	amendEmployment,
	createEmployment,
} from "../src/features/workforce-records/employment/employment";
import type { HumanResourcesPermission } from "../src/kernel/authorization/authorize";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
} from "../src/kernel/authorization/permissions";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/kernel/execution/error-codes";
import {
	runSequential,
	sequentialContinue,
} from "../src/kernel/execution/run-sequential";
import { createMemoryHumanResourcesStore } from "../src/testing/index";
import {
	createTestHumanResourcesCommandOptions,
	TEST_ORGANIZATION_DIMENSION_KEYS,
} from "./helpers/command-options";
import {
	completeOnboardingPath,
	finalizeEmploymentTermination,
} from "./helpers/lifecycle-test-fixtures";
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
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
	});
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
	if (!employee.ok) {
		return employee;
	}

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
	if (!employment.ok) {
		return employment;
	}

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
	if (!seeded.ok) {
		return seeded;
	}

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
	if (!positionA.ok) {
		return positionA;
	}

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
	if (!positionB.ok) {
		return positionB;
	}

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
	if (!assignment.ok) {
		return assignment;
	}

	return {
		ok: true as const,
		employee: seeded.employee,
		employment: seeded.employment,
		positionA: positionA.data,
		positionB: positionB.data,
		assignment: assignment.data,
	};
}

describe("human-resources lifecycle", () => {
	it("runs the full valid transition path with handoff events", async () => {
		const ready = harness();
		const seeded = await seedEmploymentWithAssignment(ready, {
			organizationId: ORG_A,
			suffix: "happy",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const onboarding = await completeOnboardingPath(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			employmentId: seeded.employment.id,
			employeeId: seeded.employee.id,
			suffix: "happy",
		});
		if (!onboarding.ok) {
			expect.fail(`${onboarding.code}: ${onboarding.message}`);
		}
		expect(onboarding.ok).toBe(true);
		if (!onboarding.ok) {
			return;
		}
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
		if (!probation.ok) {
			return;
		}

		const outcome = await recordProbationOutcome(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-prob-outcome",
				probationReviewId: probation.data.id,
				outcome: "passed",
				outcomeRecordedOn: "2025-03-15",
				reason: "Met probation objectives",
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
		if (!confirmation.ok) {
			return;
		}

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
		if (!transfer.ok) {
			return;
		}
		expect(transfer.data.toPositionId).toBe(seeded.positionB.id);

		const termination = await finalizeEmploymentTermination(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-term",
			idempotencyKey: "idem-term-happy",
			employmentId: seeded.employment.id,
			reasonCode: "resignation",
			reasonDetail: "Voluntary resignation",
			effectiveOn: "2025-06-01",
		});
		expect(termination.ok).toBe(true);
		if (!termination.ok) {
			return;
		}
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
		if (!offboarding.ok) {
			return;
		}

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
		if (!offTasks.ok) {
			return;
		}
		const [offTask] = offTasks.data;
		expect(offTask).toBeDefined();
		if (!offTask) {
			return;
		}

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
		if (!(clearance.ok && clearance.data)) {
			return;
		}

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

		const accessRevocation = await getOffboardingAccessRevocationByCase(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-access-get",
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(accessRevocation.ok).toBe(true);
		if (!(accessRevocation.ok && accessRevocation.data)) {
			return;
		}

		const accessRecorded = await recordOffboardingAccessRevocation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-access",
				accessRevocationId: accessRevocation.data.id,
				revokedOn: "2025-06-04",
				summary: "Access revoked",
				expectedVersion: accessRevocation.data.version,
			},
			ready,
		);
		expect(accessRecorded.ok).toBe(true);

		const payrollHandoff = await getOffboardingPayrollHandoffByCase(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-payroll-get",
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(payrollHandoff.ok).toBe(true);
		if (!(payrollHandoff.ok && payrollHandoff.data)) {
			return;
		}

		const payrollRecorded = await recordOffboardingPayrollHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-payroll",
				payrollHandoffId: payrollHandoff.data.id,
				readyOn: "2025-06-05",
				summary: "Final payroll handoff ready",
				expectedVersion: payrollHandoff.data.version,
			},
			ready,
		);
		expect(payrollRecorded.ok).toBe(true);

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
		if (!completedOffboarding.ok) {
			return;
		}
		expect(completedOffboarding.data.status).toBe("completed");

		const eventTypes = ready.ports.outbox.calls.map((call) => call.type);
		expect(eventTypes).toContain(HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT);
		expect(eventTypes).toContain(HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT);

		const transferEvent = ready.ports.outbox.calls.find(
			(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
		);
		expect(transferEvent?.payload.effectiveOn).toBe("2025-05-01");
		const terminationEvent = ready.ports.outbox.calls.find(
			(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
		);
		expect(terminationEvent?.payload.effectiveOn).toBe("2025-06-01");
		expect(JSON.stringify(ready.ports.outbox.calls)).not.toContain(
			"Exit interview completed",
		);

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
		if (!seeded.ok) {
			return;
		}

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
		if (!active.ok) {
			return;
		}

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
		if (!started.ok) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!withAssignment.ok) {
			return;
		}

		const term = await finalizeEmploymentTermination(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-dup-term",
			idempotencyKey: "idem-dup-term",
			employmentId: withAssignment.employment.id,
			reasonCode: "layoff",
			reasonDetail: "Reduction",
			effectiveOn: "2025-07-01",
		});
		expect(term.ok).toBe(true);
		if (!term.ok) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!first.ok) {
			return;
		}

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

	it("rejects termination before start and duplicate finalized termination", async () => {
		const ready = harness();
		const seeded = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "term-bad",
			startsOn: "2025-06-01",
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		const beforeStart = await proposeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-before",
				idempotencyKey: "idem-term-before",
				employmentId: seeded.employment.id,
				reasonCode: "error",
				reasonDetail: "Too early",
				effectiveOn: "2025-05-01",
				rehireEligible: true,
			},
			ready,
		);
		expect(beforeStart.ok).toBe(false);

		const first = await finalizeEmploymentTermination(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-term-ok",
			idempotencyKey: "idem-term-ok",
			employmentId: seeded.employment.id,
			reasonCode: "resignation",
			reasonDetail: "Leaving",
			effectiveOn: "2025-07-01",
		});
		expect(first.ok).toBe(true);

		const second = await proposeTermination(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-term-dup",
				idempotencyKey: "idem-term-dup",
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Leaving again",
				effectiveOn: "2025-07-02",
				rehireEligible: false,
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
		if (!seeded.ok) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!started.ok) {
			return;
		}

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
		if (!tasks.ok) {
			return;
		}
		const task = tasks.data.find(
			(row) => row.code === ONBOARDING_TASK_CODE_ORIENTATION,
		);
		if (!task) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!first.ok) {
			return;
		}

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
		if (!replay.ok) {
			return;
		}
		expect(replay.data.id).toBe(first.data.id);

		const otherEmployment = await seedActiveEmployment(ready, {
			organizationId: ORG_A,
			suffix: "idem-b",
		});
		expect(otherEmployment.ok).toBe(true);
		if (!otherEmployment.ok) {
			return;
		}

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
		if (!seeded.ok) {
			return;
		}

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
		if (!active.ok) {
			return;
		}

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

	describe("Slice 6.8 — Probation and confirmation", () => {
		it("runs assessment → extend → passed outcome → confirm with enriched events", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s68-happy",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const outboxBefore = ready.ports.outbox.calls.length;

			const probation = await openProbation(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-open",
					idempotencyKey: "idem-s68-open",
					employmentId: seeded.employment.id,
					startsOn: "2025-01-01",
					endsOn: "2025-04-01",
				},
				ready,
			);
			expect(probation.ok).toBe(true);
			if (!probation.ok) {
				return;
			}

			const assessment = await recordProbationAssessment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-assessment",
					probationReviewId: probation.data.id,
					reviewedOn: "2025-02-01",
					reason: "Mid-probation check-in positive",
					evidenceReference: "HR-ASSESS-001",
					expectedVersion: probation.data.version,
				},
				ready,
			);
			expect(assessment.ok).toBe(true);
			if (!assessment.ok) {
				return;
			}

			const stillOpen = await ready.store.getProbationReview({
				organizationId: ORG_A,
				probationReviewId: probation.data.id,
			});
			expect(stillOpen.ok).toBe(true);
			if (stillOpen.ok && stillOpen.data) {
				expect(stillOpen.data.status).toBe("open");
			}

			const extended = await extendProbation(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-extend",
					probationReviewId: probation.data.id,
					newEndsOn: "2025-05-01",
					reason: "Additional ramp time required",
					evidenceReference: "HR-EXT-001",
					expectedVersion:
						stillOpen.data?.version ?? probation.data.version + 1,
				},
				ready,
			);
			expect(extended.ok).toBe(true);
			if (!extended.ok) {
				return;
			}

			const passed = await recordProbationOutcome(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-outcome",
					probationReviewId: extended.data.id,
					outcome: "passed",
					outcomeRecordedOn: "2025-04-30",
					reason: "Probation objectives met",
					evidenceReference: "HR-OUT-001",
					expectedVersion: extended.data.version,
				},
				ready,
			);
			expect(passed.ok).toBe(true);
			if (!passed.ok) {
				return;
			}

			const confirmation = await confirmEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-confirm",
					idempotencyKey: "idem-s68-confirm",
					employmentId: seeded.employment.id,
					confirmedOn: "2025-05-01",
					evidenceNote: "Confirmation after passed probation",
				},
				ready,
			);
			expect(confirmation.ok).toBe(true);

			const reviews = await listProbationReviewsByEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-list-reviews",
					employmentId: seeded.employment.id,
				},
				ready,
			);
			expect(reviews.ok).toBe(true);
			if (reviews.ok) {
				expect(reviews.data).toHaveLength(1);
				expect(reviews.data[0]?.status).toBe("closed");
			}

			const assessments = await listProbationAssessments(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-list-assessments",
					probationReviewId: probation.data.id,
				},
				ready,
			);
			expect(assessments.ok).toBe(true);
			if (assessments.ok) {
				expect(assessments.data).toHaveLength(1);
			}

			const sliceEvents = ready.ports.outbox.calls.slice(outboxBefore);
			expect(
				sliceEvents.some(
					(call) =>
						call.type === HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
				),
			).toBe(true);
			expect(
				sliceEvents.some(
					(call) => call.type === HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
				),
			).toBe(true);
			expect(
				sliceEvents.some(
					(call) => call.type === HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
				),
			).toBe(true);
			expect(
				sliceEvents.some(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
				),
			).toBe(true);
		});

		it("blocks confirmation after failed probation outcome", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s68-failed",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const probation = await openProbation(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-fail-open",
					idempotencyKey: "idem-s68-fail-open",
					employmentId: seeded.employment.id,
					startsOn: "2025-01-01",
					endsOn: "2025-03-01",
				},
				ready,
			);
			expect(probation.ok).toBe(true);
			if (!probation.ok) {
				return;
			}

			await recordProbationOutcome(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-fail-outcome",
					probationReviewId: probation.data.id,
					outcome: "failed",
					outcomeRecordedOn: "2025-02-28",
					reason: "Did not meet expectations",
					expectedVersion: probation.data.version,
				},
				ready,
			);

			const confirmation = await confirmEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-fail-confirm",
					idempotencyKey: "idem-s68-fail-confirm",
					employmentId: seeded.employment.id,
					confirmedOn: "2025-03-01",
					evidenceNote: "Should be blocked",
				},
				ready,
			);
			expect(confirmation.ok).toBe(false);
			if (!confirmation.ok) {
				expect(humanResourcesCodeFromResult(confirmation)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});

		it("rejects outcome outside probation period and confirmation before passed outcome", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s68-dates",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const probation = await openProbation(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-date-open",
					idempotencyKey: "idem-s68-date-open",
					employmentId: seeded.employment.id,
					startsOn: "2025-01-01",
					endsOn: "2025-03-01",
				},
				ready,
			);
			expect(probation.ok).toBe(true);
			if (!probation.ok) {
				return;
			}

			const outsideOutcome = await recordProbationOutcome(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-outside-outcome",
					probationReviewId: probation.data.id,
					outcome: "passed",
					outcomeRecordedOn: "2025-04-01",
					reason: "Late outcome",
					expectedVersion: probation.data.version,
				},
				ready,
			);
			expect(outsideOutcome.ok).toBe(false);
			if (!outsideOutcome.ok) {
				expect(humanResourcesCodeFromResult(outsideOutcome)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}

			const passed = await recordProbationOutcome(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-pass-outcome",
					probationReviewId: probation.data.id,
					outcome: "passed",
					outcomeRecordedOn: "2025-03-01",
					reason: "Passed on last day",
					expectedVersion: probation.data.version,
				},
				ready,
			);
			expect(passed.ok).toBe(true);
			if (!passed.ok) {
				return;
			}

			const earlyConfirm = await confirmEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s68-early-confirm",
					idempotencyKey: "idem-s68-early-confirm",
					employmentId: seeded.employment.id,
					confirmedOn: "2025-02-15",
					evidenceNote: "Too early",
				},
				ready,
			);
			expect(earlyConfirm.ok).toBe(false);
			if (!earlyConfirm.ok) {
				expect(humanResourcesCodeFromResult(earlyConfirm)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});
	});

	describe("Slice 6.9 — Transfer", () => {
		const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
			dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
			isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
			standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
			standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
			standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
		}));

		const TRANSFER_ALT_DIMENSION_KEYS = {
			legalEntityKey: "LE-ALT",
			businessUnitKey: "BU-ALT",
			locationKey: "LOC-ALT",
			costCentreKey: "CC-ALT",
			projectKey: "PRJ-ALT",
		} as const;

		it("wires transfer lineage, movement, audit, and transferred event", async () => {
			const ready = harness();
			const seeded = await seedEmploymentWithAssignment(ready, {
				organizationId: ORG_A,
				suffix: "s69-happy",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const auditBefore = ready.ports.audit.calls.length;
			const outboxBefore = ready.ports.outbox.calls.length;

			const transfer = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-happy",
					idempotencyKey: "idem-s69-happy",
					employmentId: seeded.employment.id,
					toPositionId: seeded.positionB.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-05-01",
					reason: "Org restructure",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) {
				return;
			}

			expect(transfer.data.movementKind).toBe("transfer");
			expect(transfer.data.fromAssignmentId).toBeDefined();
			expect(transfer.data.toAssignmentId).toBeDefined();
			expect(transfer.data.toPositionId).toBe(seeded.positionB.id);

			const predecessor = await ready.store.getAssignmentById({
				organizationId: ORG_A,
				assignmentId: transfer.data.fromAssignmentId,
			});
			const successor = await ready.store.getAssignmentById({
				organizationId: ORG_A,
				assignmentId: transfer.data.toAssignmentId,
			});
			expect(predecessor.ok).toBe(true);
			expect(successor.ok).toBe(true);
			if (
				!(predecessor.ok && successor.ok && predecessor.data && successor.data)
			) {
				return;
			}

			expect(predecessor.data.endsOn).toBe("2025-04-30");
			expect(predecessor.data.successorAssignmentId).toBe(successor.data.id);
			expect(predecessor.data.transferMovementId).toBe(transfer.data.id);
			expect(successor.data.startsOn).toBe("2025-05-01");
			expect(successor.data.predecessorAssignmentId).toBe(predecessor.data.id);
			expect(successor.data.transferMovementId).toBe(transfer.data.id);

			const movementAudit = ready.ports.audit.calls
				.slice(auditBefore)
				.find(
					(call) =>
						call.entity === "hr_employment_movement" &&
						call.entityId === transfer.data.id &&
						call.action === "CREATE",
				);
			expect(movementAudit).toBeDefined();
			expect(movementAudit?.correlationId).toBe("corr-s69-happy");

			const transferEvent = ready.ports.outbox.calls
				.slice(outboxBefore)
				.find(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
				);
			expect(transferEvent).toBeDefined();
			expect(transferEvent?.payload.effectiveOn).toBe("2025-05-01");
			expect(transferEvent?.correlationId).toBe("corr-s69-happy");
		});

		it("captures manager, calendar, and dimension snapshots on successor when context changes", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s69-snap",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const orgSeed = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-org-s69-snap",
			});
			expect(orgSeed).not.toBeNull();
			if (!orgSeed) {
				return;
			}

			const positionA = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-pos-a",
					code: "PA-s69-snap",
					title: "Role A",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionA.ok).toBe(true);
			if (!positionA.ok) {
				return;
			}

			const positionB = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-pos-b",
					code: "PB-s69-snap",
					title: "Role B",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionB.ok).toBe(true);
			if (!positionB.ok) {
				return;
			}

			const managerOne = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-mgr1",
					idempotencyKey: "idem-s69-mgr1",
					employeeNumber: "M-S69-1",
					legalName: "Manager One",
				},
				ready,
			);
			expect(managerOne.ok).toBe(true);
			if (!managerOne.ok) {
				return;
			}

			const managerTwo = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-mgr2",
					idempotencyKey: "idem-s69-mgr2",
					employeeNumber: "M-S69-2",
					legalName: "Manager Two",
				},
				ready,
			);
			expect(managerTwo.ok).toBe(true);
			if (!managerTwo.ok) {
				return;
			}

			const reportingOne = await assignPrimaryReportingLine(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-reporting-1",
					employeeId: seeded.employee.id,
					managerEmployeeId: managerOne.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(reportingOne.ok).toBe(true);
			if (!reportingOne.ok) {
				return;
			}

			const calendarOne = await createWorkCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-cal-1",
					idempotencyKey: "idem-s69-cal-1",
					code: "CAL-S69-1",
					name: "Calendar One",
					timezone: "UTC",
					calendarVersion: "v1",
					workWeek: STANDARD_WEEK,
					standardHoursPerDay: "8.00",
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(calendarOne.ok).toBe(true);
			if (!calendarOne.ok) {
				return;
			}

			const calendarAssignOne = await assignEmploymentCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-cal-assign-1",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					calendarId: calendarOne.data.id,
					effectiveFrom: "2025-01-01",
				},
				ready,
			);
			expect(calendarAssignOne.ok).toBe(true);
			if (!calendarAssignOne.ok) {
				return;
			}

			const openAssignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-open",
					employmentId: seeded.employment.id,
					positionId: positionA.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(openAssignment.ok).toBe(true);
			if (!openAssignment.ok) {
				return;
			}
			expect(openAssignment.data.managerEmployeeIdSnapshot).toBe(
				managerOne.data.id,
			);
			expect(openAssignment.data.workCalendarIdSnapshot).toBe(
				calendarOne.data.id,
			);

			const reportingTwo = await replacePrimaryReportingLine(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-reporting-2",
					employeeId: seeded.employee.id,
					managerEmployeeId: managerTwo.data.id,
					startsOn: "2025-04-01",
					closePriorOn: "2025-03-31",
				},
				ready,
			);
			expect(reportingTwo.ok).toBe(true);
			if (!reportingTwo.ok) {
				return;
			}

			const calendarTwo = await createWorkCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-cal-2",
					idempotencyKey: "idem-s69-cal-2",
					code: "CAL-S69-2",
					name: "Calendar Two",
					timezone: "UTC",
					calendarVersion: "v1",
					workWeek: STANDARD_WEEK,
					standardHoursPerDay: "8.00",
					effectiveFrom: "2025-04-01",
				},
				ready,
			);
			expect(calendarTwo.ok).toBe(true);
			if (!calendarTwo.ok) {
				return;
			}

			const calendarOneEnded = await endWorkCalendarAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-cal-end-1",
					assignmentId: calendarAssignOne.data.id,
					effectiveTo: "2025-03-31",
					expectedVersion: calendarAssignOne.data.version,
				},
				ready,
			);
			expect(calendarOneEnded.ok).toBe(true);
			if (!calendarOneEnded.ok) {
				return;
			}

			const calendarAssignTwo = await assignEmploymentCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-cal-assign-2",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					calendarId: calendarTwo.data.id,
					effectiveFrom: "2025-04-01",
				},
				ready,
			);
			expect(calendarAssignTwo.ok).toBe(true);
			if (!calendarAssignTwo.ok) {
				return;
			}

			const transfer = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-snap",
					idempotencyKey: "idem-s69-snap",
					employmentId: seeded.employment.id,
					toPositionId: positionB.data.id,
					...TRANSFER_ALT_DIMENSION_KEYS,
					effectiveOn: "2025-05-01",
					reason: "Context change transfer",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) {
				return;
			}

			const predecessor = await ready.store.getAssignmentById({
				organizationId: ORG_A,
				assignmentId: transfer.data.fromAssignmentId,
			});
			const successor = await ready.store.getAssignmentById({
				organizationId: ORG_A,
				assignmentId: transfer.data.toAssignmentId,
			});
			expect(predecessor.ok).toBe(true);
			expect(successor.ok).toBe(true);
			if (
				!(predecessor.ok && successor.ok && predecessor.data && successor.data)
			) {
				return;
			}

			expect(predecessor.data.managerEmployeeIdSnapshot).toBe(
				managerOne.data.id,
			);
			expect(predecessor.data.workCalendarIdSnapshot).toBe(calendarOne.data.id);
			expect(predecessor.data.organizationDimensions?.legal_entity.key).toBe(
				TEST_ORGANIZATION_DIMENSION_KEYS.legalEntityKey,
			);

			expect(successor.data.managerEmployeeIdSnapshot).toBe(managerTwo.data.id);
			expect(successor.data.workCalendarIdSnapshot).toBe(calendarTwo.data.id);
			expect(successor.data.organizationDimensions?.legal_entity.key).toBe(
				TRANSFER_ALT_DIMENSION_KEYS.legalEntityKey,
			);
			expect(successor.data.managerEmployeeIdSnapshot).not.toBe(
				predecessor.data.managerEmployeeIdSnapshot,
			);
			expect(successor.data.workCalendarIdSnapshot).not.toBe(
				predecessor.data.workCalendarIdSnapshot,
			);
			expect(successor.data.organizationDimensions?.legal_entity.key).not.toBe(
				predecessor.data.organizationDimensions?.legal_entity.key,
			);
		});

		it("rejects same position, frozen target, and idempotency payload mismatch", async () => {
			const ready = harness();
			const seeded = await seedEmploymentWithAssignment(ready, {
				organizationId: ORG_A,
				suffix: "s69-reject",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const same = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-same",
					idempotencyKey: "idem-s69-same",
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
			if (!orgSeed) {
				return;
			}

			const target = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-frozen-pos",
					code: "PF-s69-frozen",
					title: "Frozen role",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(target.ok).toBe(true);
			if (!target.ok) {
				return;
			}

			const frozen = await freezePosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-freeze",
					positionId: target.data.id,
					expectedVersion: target.data.version,
				},
				ready,
			);
			expect(frozen.ok).toBe(true);
			if (!frozen.ok) {
				return;
			}

			const toFrozen = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-frozen",
					idempotencyKey: "idem-s69-frozen",
					employmentId: seeded.employment.id,
					toPositionId: frozen.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-05-01",
					reason: "bad target",
				},
				ready,
			);
			expect(toFrozen.ok).toBe(false);

			const accepted = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-idem",
					idempotencyKey: "idem-s69-mismatch",
					employmentId: seeded.employment.id,
					toPositionId: seeded.positionB.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-06-01",
					reason: "First payload",
				},
				ready,
			);
			expect(accepted.ok).toBe(true);
			if (!accepted.ok) {
				return;
			}

			const mismatch = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s69-idem-mismatch",
					idempotencyKey: "idem-s69-mismatch",
					employmentId: seeded.employment.id,
					toPositionId: seeded.positionB.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-06-01",
					reason: "Different payload",
				},
				ready,
			);
			expect(mismatch.ok).toBe(false);
			if (!mismatch.ok) {
				expect(humanResourcesCodeFromResult(mismatch)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}
		});
	});

	describe("Slice 6.7 — onboarding completion", () => {
		it("merges governed checklist on start and blocks completion until readiness", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s67-gate",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const started = await startOnboarding(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s67-start",
					idempotencyKey: "idem-s67-start",
					employmentId: seeded.employment.id,
					tasks: [
						{
							code: ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
							title: "Identity documents",
							mandatory: true,
						},
					],
				},
				ready,
			);
			expect(started.ok).toBe(true);
			if (!started.ok) {
				return;
			}

			const tasks = await listOnboardingTasks(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s67-tasks",
					onboardingCaseId: started.data.id,
				},
				ready,
			);
			expect(tasks.ok).toBe(true);
			if (!tasks.ok) {
				return;
			}
			expect(tasks.data).toHaveLength(GOVERNED_ONBOARDING_CHECKLIST.length);

			const blockedComplete = await completeOnboarding(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s67-blocked-complete",
					onboardingCaseId: started.data.id,
					expectedVersion: started.data.version,
				},
				ready,
			);
			expect(blockedComplete.ok).toBe(false);

			const workEligibilityTask = tasks.data.find(
				(row) => row.code === ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
			);
			expect(workEligibilityTask).toBeDefined();
			if (!workEligibilityTask) {
				return;
			}

			const blockedTask = await completeOnboardingTask(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s67-blocked-task",
					taskId: workEligibilityTask.id,
					status: "completed",
					expectedVersion: workEligibilityTask.version,
				},
				ready,
			);
			expect(blockedTask.ok).toBe(false);
			if (!blockedTask.ok) {
				expect(humanResourcesCodeFromResult(blockedTask)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}

			const happySeed = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s67-happy",
			});
			expect(happySeed.ok).toBe(true);
			if (!happySeed.ok) {
				return;
			}

			const completed = await completeOnboardingPath(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				employmentId: happySeed.employment.id,
				employeeId: happySeed.employee.id,
				suffix: "s67-happy-complete",
			});
			expect(completed.ok).toBe(true);
			if (!completed.ok) {
				return;
			}
			expect(completed.data.status).toBe("completed");
		});
	});

	describe("Slice 6.10 — Termination and offboarding", () => {
		it("rejects finalize without approval and double approval", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s610-gates",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const proposed = await proposeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-propose",
					idempotencyKey: "idem-s610-propose",
					employmentId: seeded.employment.id,
					reasonCode: "resignation",
					reasonDetail: "Leaving",
					effectiveOn: "2025-08-01",
					rehireEligible: true,
				},
				ready,
			);
			expect(proposed.ok).toBe(true);
			if (!proposed.ok) {
				return;
			}

			const finalizeWithoutApprove = await finalizeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-finalize-unapproved",
					terminationId: proposed.data.id,
					expectedVersion: proposed.data.version,
				},
				ready,
			);
			expect(finalizeWithoutApprove.ok).toBe(false);
			if (!finalizeWithoutApprove.ok) {
				expect(humanResourcesCodeFromResult(finalizeWithoutApprove)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}

			const approved = await approveTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-approve",
					terminationId: proposed.data.id,
					expectedVersion: proposed.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}

			const doubleApprove = await approveTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-double-approve",
					terminationId: approved.data.id,
					expectedVersion: approved.data.version,
				},
				ready,
			);
			expect(doubleApprove.ok).toBe(false);
			if (!doubleApprove.ok) {
				expect(humanResourcesCodeFromResult(doubleApprove)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});

		it("rejects a second open draft and double finalize", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s610-draft",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const firstDraft = await proposeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-draft-1",
					idempotencyKey: "idem-s610-draft-1",
					employmentId: seeded.employment.id,
					reasonCode: "resignation",
					reasonDetail: "First draft",
					effectiveOn: "2025-09-01",
					rehireEligible: true,
				},
				ready,
			);
			expect(firstDraft.ok).toBe(true);
			if (!firstDraft.ok) {
				return;
			}

			const secondDraft = await proposeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-draft-2",
					idempotencyKey: "idem-s610-draft-2",
					employmentId: seeded.employment.id,
					reasonCode: "resignation",
					reasonDetail: "Second draft",
					effectiveOn: "2025-09-15",
					rehireEligible: false,
				},
				ready,
			);
			expect(secondDraft.ok).toBe(false);
			if (!secondDraft.ok) {
				expect(humanResourcesCodeFromResult(secondDraft)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}

			const approved = await approveTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-draft-approve",
					terminationId: firstDraft.data.id,
					expectedVersion: firstDraft.data.version,
				},
				ready,
			);
			expect(approved.ok).toBe(true);
			if (!approved.ok) {
				return;
			}

			const finalized = await finalizeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-draft-finalize",
					terminationId: approved.data.id,
					expectedVersion: approved.data.version,
				},
				ready,
			);
			expect(finalized.ok).toBe(true);
			if (!finalized.ok) {
				return;
			}
			expect(finalized.data.status).toBe("finalized");
			expect(finalized.data.rehireEligible).toBe(true);

			const doubleFinalize = await finalizeTermination(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-double-finalize",
					terminationId: finalized.data.id,
					expectedVersion: finalized.data.version,
				},
				ready,
			);
			expect(doubleFinalize.ok).toBe(false);
			if (!doubleFinalize.ok) {
				expect(humanResourcesCodeFromResult(doubleFinalize)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});

		it("blocks completeOffboarding until access revocation and payroll handoff facts are ready", async () => {
			const ready = harness();
			const seeded = await seedActiveEmployment(ready, {
				organizationId: ORG_A,
				suffix: "s610-off-facts",
			});
			expect(seeded.ok).toBe(true);
			if (!seeded.ok) {
				return;
			}

			const termination = await finalizeEmploymentTermination(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-s610-term",
				idempotencyKey: "idem-s610-term",
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Exit",
				effectiveOn: "2025-10-01",
			});
			expect(termination.ok).toBe(true);
			if (!termination.ok) {
				return;
			}

			const offboarding = await startOffboarding(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-off-start",
					idempotencyKey: "idem-s610-off-start",
					employmentId: seeded.employment.id,
					terminationId: termination.data.id,
					tasks: [
						{ code: "return_laptop", title: "Return laptop", mandatory: true },
					],
				},
				ready,
			);
			expect(offboarding.ok).toBe(true);
			if (!offboarding.ok) {
				return;
			}

			const accessSeed = await getOffboardingAccessRevocationByCase(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-access-seed",
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(accessSeed.ok).toBe(true);
			if (!accessSeed.ok || accessSeed.data === null) {
				return;
			}
			expect(accessSeed.data.status).toBe("pending");

			const payrollSeed = await getOffboardingPayrollHandoffByCase(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-payroll-seed",
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(payrollSeed.ok).toBe(true);
			if (!payrollSeed.ok || payrollSeed.data === null) {
				return;
			}
			expect(payrollSeed.data.status).toBe("pending");

			const tasks = await listOffboardingTasks(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-off-tasks",
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(tasks.ok).toBe(true);
			if (!tasks.ok) {
				return;
			}
			const [task] = tasks.data;
			expect(task).toBeDefined();
			if (!task) {
				return;
			}

			const taskDone = await completeOffboardingTask(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-off-task",
					taskId: task.id,
					status: "completed",
					expectedVersion: task.version,
				},
				ready,
			);
			expect(taskDone.ok).toBe(true);

			const exit = await recordExitInterview(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-exit",
					offboardingCaseId: offboarding.data.id,
					conductedOn: "2025-10-02",
					notes: "Exit interview",
				},
				ready,
			);
			expect(exit.ok).toBe(true);

			const clearance = await getClearanceByOffboardingCase(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-clearance-get",
					offboardingCaseId: offboarding.data.id,
				},
				ready,
			);
			expect(clearance.ok).toBe(true);
			if (!clearance.ok || clearance.data === null) {
				return;
			}

			const cleared = await recordClearance(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-clearance",
					clearanceId: clearance.data.id,
					clearedOn: "2025-10-03",
					expectedVersion: clearance.data.version,
				},
				ready,
			);
			expect(cleared.ok).toBe(true);

			const blockedComplete = await completeOffboarding(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s610-blocked-complete",
					offboardingCaseId: offboarding.data.id,
					expectedVersion: offboarding.data.version,
				},
				ready,
			);
			expect(blockedComplete.ok).toBe(false);
			if (!blockedComplete.ok) {
				expect(humanResourcesCodeFromResult(blockedComplete)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});
	});

	it("does not import auth or payroll packages from lifecycle modules", async () => {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const lifecycleDir = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
			"src",
			"features",
			"employment-lifecycle",
		);
		const files = await fs.readdir(lifecycleDir);
		await runSequential(files, async (file) => {
			if (!file.endsWith(".ts")) {
				return sequentialContinue();
			}
			const body = await fs.readFile(path.join(lifecycleDir, file), "utf8");
			expect(body).not.toMatch(/@afenda\/auth/);
			expect(body).not.toMatch(/@afenda\/payroll/);
			expect(body).not.toMatch(/@afenda\/admin/);
		});
	});
});
