/**
 * Learning & Certification domain rules matrix (HR-06).
 */

import {
	HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import {
	expireCertification,
	issueCertification,
	listCertifications,
	renewCertification,
	revokeCertification,
} from "../src/learning/certification";
import { listCompletions, recordCompletion } from "../src/learning/completion";
import {
	activateCourse,
	archiveCourse,
	createCourse,
	listCourses,
	updateCourse,
} from "../src/learning/course";
import {
	assignLearning,
	enrolAssignment,
	listLearningAssignments,
	waiveAssignment,
} from "../src/learning/learning-assignment";
import {
	getLearningAttendance,
	listLearningAttendance,
	recordLearningAttendance,
} from "../src/learning/learning-attendance";
import {
	assignSessionInstructor,
	cancelSession,
	completeSession,
	createSession,
	listSessions,
	startSession,
} from "../src/learning/learning-session";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_LEARNING_MANAGE,
} from "../src/permissions";
import { runSequential } from "../src/shared/run-sequential";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-learn-a";
const ORG_B = "org-learn-b";
const ACTOR = "user-learn-1";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
	ports = createMemoryMutationPorts(),
) {
	const store = createMemoryHumanResourcesStore();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	return { store, ports, authorization };
}

async function seedEmployee(
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
	return employee.data;
}

async function seedCourse(
	ready: ReturnType<typeof harness>,
	input: { organizationId: string; code: string },
) {
	const course = await createCourse(
		{
			organizationId: input.organizationId,
			actorUserId: ACTOR,
			correlationId: `corr-course-${input.code}`,
			idempotencyKey: `idem-course-${input.code}`,
			code: input.code,
			title: `Course ${input.code}`,
			description: null,
			durationHours: null,
		},
		ready,
	);
	if (!course.ok) {
		throw new Error(`Failed to seed course: ${course.code}`);
	}
	return course.data;
}

describe("Course lifecycle", () => {
	it("creates course → updates title → archives → reactivates", async () => {
		const ready = harness();

		const created = await createCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-course-1",
				idempotencyKey: "idem-course-1",
				code: "SAFETY-101",
				title: "Safety Training",
				description: "Basic safety procedures",
				durationHours: 4,
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.code).toBe("SAFETY-101");
		expect(created.data.status).toBe("active");

		const updated = await updateCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-course-upd",
				courseId: created.data.id,
				expectedVersion: created.data.version,
				title: "Advanced Safety Training",
				description: "Updated procedures",
				durationHours: 8,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.title).toBe("Advanced Safety Training");
		expect(updated.data.durationHours).toBe("8");

		const archived = await archiveCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-course-arch",
				courseId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}
		expect(archived.data.status).toBe("archived");

		const reactivated = await activateCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-course-act",
				courseId: archived.data.id,
				expectedVersion: archived.data.version,
			},
			ready,
		);
		expect(reactivated.ok).toBe(true);
		if (!reactivated.ok) {
			return;
		}
		expect(reactivated.data.status).toBe("active");
	});

	it("rejects assignment to archived course", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "2",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "ARCHIVED-COURSE",
		});

		const archived = await archiveCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-arch-2",
				courseId: course.id,
				expectedVersion: course.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-assign-archived",
				employeeId: employee.id,
				courseId: archived.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(false);
		if (assignment.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(assignment)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("rejects activate when course is already active", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "ALREADY-ACTIVE",
		});

		const result = await activateCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-act-dup",
				courseId: course.id,
				expectedVersion: course.version,
			},
			ready,
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(result)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("prevents duplicate course code in same org", async () => {
		const ready = harness();
		const first = await createCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-1",
				idempotencyKey: "idem-dup-1",
				code: "DUP-CODE",
				title: "First",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-2",
				idempotencyKey: "idem-dup-2",
				code: "DUP-CODE",
				title: "Second",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("allows same course code in different orgs", async () => {
		const ready = harness();
		const orgA = await createCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-multi-a",
				idempotencyKey: "idem-multi-a",
				code: "MULTI-ORG",
				title: "Org A Course",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(orgA.ok).toBe(true);

		const orgB = await createCourse(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-multi-b",
				idempotencyKey: "idem-multi-b",
				code: "MULTI-ORG",
				title: "Org B Course",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(orgB.ok).toBe(true);
	});

	it("detects stale version on update", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "STALE-COURSE",
		});

		const stale = await updateCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-stale",
				courseId: course.id,
				expectedVersion: course.version + 1,
				title: "Should Fail",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		if (stale.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(stale)).toBe(
			HUMAN_RESOURCES_ERROR_STALE_VERSION,
		);
	});
});

describe("Session lifecycle", () => {
	it("creates session → starts → completes", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "SESSION-COURSE",
		});

		const created = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-session-1",
				idempotencyKey: "idem-session-1",
				courseId: course.id,
				code: "SES-001",
				title: "Session 1",
				scheduledStartsAt: "2025-03-01T09:00:00Z",
				scheduledEndsAt: "2025-03-01T17:00:00Z",
				capacity: 20,
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("scheduled");

		const started = await startSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-start-1",
				sessionId: created.data.id,
				expectedVersion: created.data.version,
				actualStartsAt: "2025-03-01T09:05:00Z",
			},
			ready,
		);
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}
		expect(started.data.status).toBe("in_progress");

		const completed = await completeSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-complete-1",
				sessionId: started.data.id,
				expectedVersion: started.data.version,
				actualEndsAt: "2025-03-01T17:10:00Z",
			},
			ready,
		);
		expect(completed.ok).toBe(true);
		if (!completed.ok) {
			return;
		}
		expect(completed.data.status).toBe("completed");
	});

	it("validates scheduled time range", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "TIME-COURSE",
		});

		const invalid = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-time-bad",
				idempotencyKey: "idem-time-bad",
				courseId: course.id,
				code: "BAD-TIME",
				title: "Invalid Times",
				scheduledStartsAt: "2025-03-01T17:00:00Z",
				scheduledEndsAt: "2025-03-01T09:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("cancels scheduled session", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CANCEL-COURSE",
		});

		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-ses",
				idempotencyKey: "idem-cancel-ses",
				courseId: course.id,
				code: "CAN-001",
				title: "To Cancel",
				scheduledStartsAt: "2025-04-01T09:00:00Z",
				scheduledEndsAt: "2025-04-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const cancelled = await cancelSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cancel-act",
				sessionId: session.data.id,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		expect(cancelled.data.status).toBe("cancelled");
	});

	it("rejects duplicate session code in same org", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "DUP-SESSION-COURSE",
		});

		const first = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-s1",
				idempotencyKey: "idem-dup-s1",
				courseId: course.id,
				code: "DUP-SES",
				title: "First Session",
				scheduledStartsAt: "2025-05-01T09:00:00Z",
				scheduledEndsAt: "2025-05-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-s2",
				idempotencyKey: "idem-dup-s2",
				courseId: course.id,
				code: "DUP-SES",
				title: "Second Session",
				scheduledStartsAt: "2025-06-01T09:00:00Z",
				scheduledEndsAt: "2025-06-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});
});

describe("Assignment lifecycle", () => {
	it("assigns learning → enrols → waives", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "assign-1",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "ASSIGN-COURSE",
		});

		const assigned = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-assign-1",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: "2025-12-31",
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
			return;
		}
		expect(assigned.data.status).toBe("pending");
		expect(ready.ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
			}),
		);

		const enroled = await enrolAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-1",
				assignmentId: assigned.data.id,
				expectedVersion: assigned.data.version,
			},
			ready,
		);
		expect(enroled.ok).toBe(true);
		if (!enroled.ok) {
			return;
		}
		expect(enroled.data.status).toBe("in_progress");

		const waived = await waiveAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-waive-1",
				assignmentId: enroled.data.id,
				expectedVersion: enroled.data.version,
			},
			ready,
		);
		expect(waived.ok).toBe(true);
		if (!waived.ok) {
			return;
		}
		expect(waived.data.status).toBe("withdrawn");
	});

	it("prevents duplicate active assignment for same employee+course", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "dup-assign",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "DUP-ASSIGN-COURSE",
		});

		const first = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-a1",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-a2",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("allows new assignment after completion", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "complete-assign",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "COMPLETE-COURSE",
		});

		const first = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-first-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-complete-for-reassign",
				assignmentId: first.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-15T10:00:00Z",
				outcome: "passed",
				assessorUserId: ACTOR,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);

		const second = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-second-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(second.ok).toBe(true);
	});
});

describe("Completion recording", () => {
	it("records completion with assessor metadata", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "comp-1",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "COMP-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp-1",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-02-01T14:30:00Z",
				outcome: "passed",
				assessorUserId: "assessor-user-1",
				notes: "Excellent performance",
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}
		expect(completion.data.outcome).toBe("passed");
		expect(completion.data.assessorUserId).toBe("assessor-user-1");
		expect(ready.ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
			}),
		);
	});

	it("prevents duplicate completion for same assignment", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "dup-comp",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "DUP-COMP-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-comp-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const first = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-comp-1",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-02-10T10:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-dup-comp-2",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-02-11T10:00:00Z",
				outcome: "failed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(second)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("links completion to session", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "session-comp",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "SESSION-COMP-COURSE",
		});
		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ses-comp",
				idempotencyKey: "idem-ses-comp",
				courseId: course.id,
				code: "SES-COMP",
				title: "Session with Completion",
				scheduledStartsAt: "2025-03-15T09:00:00Z",
				scheduledEndsAt: "2025-03-15T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ses-comp-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-ses-comp-rec",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: session.data.id,
				completedAt: "2025-03-15T17:00:00Z",
				outcome: "attended",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}
		expect(completion.data.sessionId).toBe(session.data.id);
	});
});

describe("Certification issuance", () => {
	it("issues certification from completion", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cert-1",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CERT-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const certification = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-issue",
				idempotencyKey: "idem-cert-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "CERT-001",
				issuedOn: "2025-01-11",
				expiresOn: "2026-01-11",
			},
			ready,
		);
		expect(certification.ok).toBe(true);
		if (!certification.ok) {
			return;
		}
		expect(certification.data.status).toBe("active");
		expect(certification.data.certificationCode).toBe("CERT-001");
	});

	it("validates expiry date after issued date", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cert-date",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CERT-DATE-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-date-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-date-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const invalid = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-bad-date",
				idempotencyKey: "idem-cert-bad-date",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "CERT-BAD",
				issuedOn: "2025-01-11",
				expiresOn: "2025-01-10",
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("revokes active certification", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cert-revoke",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CERT-REVOKE-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-rev-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-rev-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const certification = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-rev-issue",
				idempotencyKey: "idem-cert-rev-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "CERT-REV",
				issuedOn: "2025-01-11",
				expiresOn: null,
			},
			ready,
		);
		expect(certification.ok).toBe(true);
		if (!certification.ok) {
			return;
		}

		const revoked = await revokeCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-revoke-act",
				certificationId: certification.data.id,
				expectedVersion: certification.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) {
			return;
		}
		expect(revoked.data.status).toBe("revoked");
		expect(revoked.data.revokedAt).not.toBeNull();
		expect(revoked.data.revokedBy).toBe(ACTOR);
	});

	it("expires active certification", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cert-expire",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CERT-EXPIRE-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-exp-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-exp-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const certification = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-exp-issue",
				idempotencyKey: "idem-cert-exp-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "CERT-EXP",
				issuedOn: "2025-01-11",
				expiresOn: "2026-01-11",
			},
			ready,
		);
		expect(certification.ok).toBe(true);
		if (!certification.ok) {
			return;
		}

		const expired = await expireCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cert-expire-act",
				certificationId: certification.data.id,
				expectedVersion: certification.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}
		expect(expired.data.status).toBe("expired");
	});
});

describe("Slice 9.7 learning closure", () => {
	it("assigns session instructor on create and update", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "INST-COURSE",
		});
		const created = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-inst-create",
				idempotencyKey: "idem-inst-create",
				courseId: course.id,
				code: "INST-SES",
				title: "Instructor Session",
				scheduledStartsAt: "2025-04-01T09:00:00Z",
				scheduledEndsAt: "2025-04-01T17:00:00Z",
				capacity: 10,
				primaryInstructorUserId: "instructor-user-create",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.primaryInstructorUserId).toBe("instructor-user-create");

		const updated = await assignSessionInstructor(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-inst-update",
				sessionId: created.data.id,
				primaryInstructorUserId: "instructor-user-update",
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.primaryInstructorUserId).toBe("instructor-user-update");
	});

	it("rejects instructor assignment across organizations", async () => {
		const ready = harness();
		const courseA = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "INST-CROSS-COURSE",
		});
		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-inst-cross",
				idempotencyKey: "idem-inst-cross",
				courseId: courseA.id,
				code: "INST-CROSS",
				title: "Cross Org Session",
				scheduledStartsAt: "2025-04-02T09:00:00Z",
				scheduledEndsAt: "2025-04-02T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const denied = await assignSessionInstructor(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-inst-cross-deny",
				sessionId: session.data.id,
				primaryInstructorUserId: "instructor-user",
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
	});

	it("rejects enrollment when session is at capacity", async () => {
		const ready = harness();
		const employeeOne = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cap-1",
		});
		const employeeTwo = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cap-2",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CAP-COURSE",
		});
		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cap-session",
				idempotencyKey: "idem-cap-session",
				courseId: course.id,
				code: "CAP-SES",
				title: "Capacity Session",
				scheduledStartsAt: "2025-05-01T09:00:00Z",
				scheduledEndsAt: "2025-05-01T17:00:00Z",
				capacity: 1,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const assignmentOne = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cap-a1",
				employeeId: employeeOne.id,
				courseId: course.id,
				sessionId: session.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignmentOne.ok).toBe(true);
		if (!assignmentOne.ok) {
			return;
		}

		const enrolledOne = await enrolAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cap-e1",
				assignmentId: assignmentOne.data.id,
				expectedVersion: assignmentOne.data.version,
			},
			ready,
		);
		expect(enrolledOne.ok).toBe(true);
		if (!enrolledOne.ok) {
			return;
		}

		const assignmentTwo = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cap-a2",
				employeeId: employeeTwo.id,
				courseId: course.id,
				sessionId: session.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignmentTwo.ok).toBe(true);
		if (!assignmentTwo.ok) {
			return;
		}

		const enrolledTwo = await enrolAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cap-e2",
				assignmentId: assignmentTwo.data.id,
				expectedVersion: assignmentTwo.data.version,
			},
			ready,
		);
		expect(enrolledTwo.ok).toBe(false);
		if (enrolledTwo.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(enrolledTwo)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	});

	it("records and lists learning attendance", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "attend-1",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "ATTEND-COURSE",
		});
		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-session",
				idempotencyKey: "idem-attend-session",
				courseId: course.id,
				code: "ATTEND-SES",
				title: "Attendance Session",
				scheduledStartsAt: "2025-06-01T09:00:00Z",
				scheduledEndsAt: "2025-06-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const started = await startSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-start",
				sessionId: session.data.id,
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(started.ok).toBe(true);
		if (!started.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-assign",
				employeeId: employee.id,
				courseId: course.id,
				sessionId: session.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const enrolled = await enrolAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-enrol",
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(enrolled.ok).toBe(true);
		if (!enrolled.ok) {
			return;
		}

		const attendance = await recordLearningAttendance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-record",
				idempotencyKey: "idem-attend-record",
				sessionId: session.data.id,
				assignmentId: assignment.data.id,
				status: "present",
				recordedAt: "2025-06-01T10:00:00Z",
			},
			ready,
		);
		expect(attendance.ok).toBe(true);
		if (!attendance.ok) {
			return;
		}
		expect(attendance.data.status).toBe("present");

		const replay = await recordLearningAttendance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-replay",
				idempotencyKey: "idem-attend-record",
				sessionId: session.data.id,
				assignmentId: assignment.data.id,
				status: "present",
				recordedAt: "2025-06-01T10:00:00Z",
			},
			ready,
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}
		expect(replay.data.id).toBe(attendance.data.id);

		const fetched = await getLearningAttendance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-get",
				attendanceId: attendance.data.id,
			},
			ready,
		);
		expect(fetched.ok).toBe(true);
		if (!fetched.ok) {
			return;
		}
		expect(fetched.data?.id).toBe(attendance.data.id);

		const listed = await listLearningAttendance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-list",
				sessionId: session.data.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.attendanceRecords.length).toBe(1);
	});

	it("rejects learning attendance before session starts", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "attend-bad",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "ATTEND-BAD-COURSE",
		});
		const session = await createSession(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-bad-session",
				idempotencyKey: "idem-attend-bad-session",
				courseId: course.id,
				code: "ATTEND-BAD",
				title: "Scheduled Session",
				scheduledStartsAt: "2025-07-01T09:00:00Z",
				scheduledEndsAt: "2025-07-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-bad-assign",
				employeeId: employee.id,
				courseId: course.id,
				sessionId: session.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const enrolled = await enrolAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-bad-enrol",
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(enrolled.ok).toBe(true);
		if (!enrolled.ok) {
			return;
		}

		const denied = await recordLearningAttendance(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-attend-bad-record",
				idempotencyKey: "idem-attend-bad-record",
				sessionId: session.data.id,
				assignmentId: assignment.data.id,
				status: "present",
				recordedAt: "2025-07-01T10:00:00Z",
			},
			ready,
		);
		expect(denied.ok).toBe(false);
	});

	it("renews expired certification with successor lineage", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "renew-1",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "RENEW-COURSE",
		});
		const firstAssignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-a1",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(firstAssignment.ok).toBe(true);
		if (!firstAssignment.ok) {
			return;
		}

		const firstCompletion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-c1",
				assignmentId: firstAssignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2024-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(firstCompletion.ok).toBe(true);
		if (!firstCompletion.ok) {
			return;
		}

		const issued = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-issue",
				idempotencyKey: "idem-renew-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: firstCompletion.data.id,
				certificationCode: "RENEW-001",
				issuedOn: "2024-01-11",
				expiresOn: "2025-01-11",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}

		const expired = await expireCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-expire",
				certificationId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}

		const renewalAssignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-a2",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(renewalAssignment.ok).toBe(true);
		if (!renewalAssignment.ok) {
			return;
		}

		const renewalCompletion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-c2",
				assignmentId: renewalAssignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-02-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(renewalCompletion.ok).toBe(true);
		if (!renewalCompletion.ok) {
			return;
		}

		const renewed = await renewCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-act",
				idempotencyKey: "idem-renew-act",
				certificationId: expired.data.id,
				completionId: renewalCompletion.data.id,
				certificationCode: "RENEW-002",
				issuedOn: "2025-02-11",
				expiresOn: "2026-02-11",
				expectedVersion: expired.data.version,
			},
			ready,
		);
		expect(renewed.ok).toBe(true);
		if (!renewed.ok) {
			return;
		}
		expect(renewed.data.status).toBe("active");
		expect(renewed.data.renewedFromCertificationId).toBe(expired.data.id);
		expect(ready.ports.outbox.calls).toContainEqual(
			expect.objectContaining({
				type: HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
			}),
		);
	});

	it("rejects renewal with non-passed completion", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "renew-bad",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "RENEW-BAD-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-bad-a",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-bad-c",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-03-10T12:00:00Z",
				outcome: "failed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const denied = await renewCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-renew-bad-act",
				idempotencyKey: "idem-renew-bad-act",
				certificationId: "00000000-0000-4000-8000-000000000099",
				completionId: completion.data.id,
				certificationCode: "RENEW-BAD",
				issuedOn: "2025-03-11",
				expiresOn: null,
				expectedVersion: 1,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
	});
});

describe("Cross-organization boundaries", () => {
	it("rejects assignment with employee from different org", async () => {
		const ready = harness();
		const employeeA = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cross-emp",
		});
		const courseB = await seedCourse(ready, {
			organizationId: ORG_B,
			code: "CROSS-COURSE",
		});

		const invalid = await assignLearning(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-cross-assign",
				employeeId: employeeA.id,
				courseId: courseB.id,
				dueOn: null,
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	});

	it("rejects completion with course from different org", async () => {
		const ready = harness();
		const employeeA = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "cross-comp-emp",
		});
		const courseA = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "CROSS-COMP-COURSE-A",
		});
		const assignmentA = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-cross-comp-assign",
				employeeId: employeeA.id,
				courseId: courseA.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignmentA.ok).toBe(true);
		if (!assignmentA.ok) {
			return;
		}

		const invalid = await recordCompletion(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: "corr-cross-comp",
				assignmentId: assignmentA.data.id,
				employeeId: employeeA.id,
				courseId: courseA.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(invalid)).toBe(
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	});
});

describe("Authorization", () => {
	it("requires learning.manage for course operations", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ]);

		const denied = await createCourse(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-course",
				idempotencyKey: "idem-authz-course",
				code: "AUTHZ-COURSE",
				title: "Denied",
				description: null,
				durationHours: null,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("requires certification.manage for certification operations", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_LEARNING_MANAGE,
		]);
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "authz-cert",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "AUTHZ-CERT-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-cert-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-cert-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		const denied = await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-authz-cert-issue",
				idempotencyKey: "idem-authz-cert-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "AUTHZ-CERT",
				issuedOn: "2025-01-11",
				expiresOn: null,
			},
			ready,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});
});

describe("List pagination", () => {
	it("lists courses with deterministic ordering", async () => {
		const ready = harness();
		await runSequential([1, 2, 3], async (i) => {
			await createCourse(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-list-${i}`,
					idempotencyKey: `idem-list-${i}`,
					code: `LIST-${i}`,
					title: `Course ${i}`,
					description: null,
					durationHours: null,
				},
				ready,
			);
		});

		const page = await listCourses(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-courses",
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.courses.length).toBeGreaterThanOrEqual(3);
		const codes = page.data.courses.map((c) => c.code);
		expect(codes).toContain("LIST-1");
		expect(codes).toContain("LIST-2");
		expect(codes).toContain("LIST-3");
	});

	it("lists sessions for a course", async () => {
		const ready = harness();
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "LIST-SESSION-COURSE",
		});

		await runSequential([1, 2], async (i) => {
			await createSession(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-list-ses-${i}`,
					idempotencyKey: `idem-list-ses-${i}`,
					courseId: course.id,
					code: `LST-SES-${i}`,
					title: `Session ${i}`,
					scheduledStartsAt: `2025-0${i}-01T09:00:00Z`,
					scheduledEndsAt: `2025-0${i}-01T17:00:00Z`,
					capacity: null,
				},
				ready,
			);
		});

		const page = await listSessions(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-sessions",
				courseId: course.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.sessions.length).toBe(2);
	});

	it("lists assignments for an employee", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "list-assign",
		});
		const course1 = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "LIST-ASSIGN-C1",
		});
		const course2 = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "LIST-ASSIGN-C2",
		});

		await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-assign-1",
				employeeId: employee.id,
				courseId: course1.id,
				dueOn: null,
			},
			ready,
		);
		await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-assign-2",
				employeeId: employee.id,
				courseId: course2.id,
				dueOn: null,
			},
			ready,
		);

		const page = await listLearningAssignments(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-assignments",
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.assignments.length).toBe(2);
	});

	it("lists completions for an employee", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "list-comp",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "LIST-COMP-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-comp-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-comp-rec",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);

		const page = await listCompletions(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-completions",
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.completions.length).toBe(1);
	});

	it("lists certifications for an employee", async () => {
		const ready = harness();
		const employee = await seedEmployee(ready, {
			organizationId: ORG_A,
			suffix: "list-cert",
		});
		const course = await seedCourse(ready, {
			organizationId: ORG_A,
			code: "LIST-CERT-COURSE",
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-cert-assign",
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-cert-comp",
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-01-10T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}

		await issueCertification(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-cert-issue",
				idempotencyKey: "idem-list-cert-issue",
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: "LIST-CERT",
				issuedOn: "2025-01-11",
				expiresOn: null,
			},
			ready,
		);

		const page = await listCertifications(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-list-certifications",
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.certifications.length).toBe(1);
	});
});
