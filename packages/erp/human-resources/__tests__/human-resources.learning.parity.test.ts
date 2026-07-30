/**
 * Memory vs Drizzle parity for learning & certification (HR-06).
 */

import { afterAll, describe, expect, it } from "vitest";
import { createEmployee } from "../src/core/employee";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	expireCertification,
	getCertification,
	issueCertification,
	listCertifications,
	renewCertification,
	revokeCertification,
} from "../src/learning/certification";
import {
	getCompletion,
	listCompletions,
	recordCompletion,
} from "../src/learning/completion";
import {
	archiveCourse,
	createCourse,
	getCourse,
	listCourses,
	updateCourse,
} from "../src/learning/course";
import {
	assignLearning,
	enrolAssignment,
	getLearningAssignment,
	listLearningAssignments,
	waiveAssignment,
} from "../src/learning/learning-assignment";
import {
	listLearningAttendance,
	recordLearningAttendance,
} from "../src/learning/learning-attendance";
import {
	assignSessionInstructor,
	completeSession,
	createSession,
	getSession,
	listSessions,
	startSession,
} from "../src/learning/learning-session";
import { runSequential } from "../src/shared/run-sequential";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import {
	humanResourcesCodeFromResult,
	resultFailureMessage,
} from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployee(
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
	return employee.data;
}

async function seedCourse(
	ready: ReturnType<typeof createHrParityHarness>,
	input: {
		organizationId: string;
		actorUserId: string;
		code: string;
	},
) {
	const course = await createCourse(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
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

function defineLearningParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-learn-parity-${suffix}`);
	const ACTOR = `user-hr-learn-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("course CRUD with status transitions", async () => {
		const ready = createHrParityHarness(adapter);
		const created = await createCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-course-crud-${suffix}`,
				idempotencyKey: `idem-course-crud-${suffix}`,
				code: `PARITY-COURSE-${suffix}`,
				title: "Parity Course",
				description: "Test description",
				durationHours: 8,
			},
			ready,
		);
		expect(created.ok, resultFailureMessage(created)).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("active");

		const retrieved = await getCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-course-${suffix}`,
				courseId: created.data.id,
			},
			ready,
		);
		expect(retrieved.ok, resultFailureMessage(retrieved)).toBe(true);
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data.code).toBe(`PARITY-COURSE-${suffix}`);

		const updated = await updateCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-upd-course-${suffix}`,
				courseId: created.data.id,
				expectedVersion: created.data.version,
				title: "Updated Title",
				description: "Updated description",
				durationHours: 16,
			},
			ready,
		);
		expect(updated.ok, resultFailureMessage(updated)).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.title).toBe("Updated Title");

		const archived = await archiveCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-arch-course-${suffix}`,
				courseId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(archived.ok, resultFailureMessage(archived)).toBe(true);
		if (!archived.ok) {
			return;
		}
		expect(archived.data.status).toBe("archived");
	});

	it("session lifecycle with time tracking", async () => {
		const ready = createHrParityHarness(adapter);
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `SESSION-${suffix}`,
		});

		const created = await createSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-session-${suffix}`,
				idempotencyKey: `idem-session-${suffix}`,
				courseId: course.id,
				code: `SES-PAR-${suffix}`,
				title: "Parity Session",
				scheduledStartsAt: "2025-06-01T09:00:00Z",
				scheduledEndsAt: "2025-06-01T17:00:00Z",
				capacity: 25,
			},
			ready,
		);
		expect(created.ok, resultFailureMessage(created)).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.status).toBe("scheduled");

		const retrieved = await getSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-ses-${suffix}`,
				sessionId: created.data.id,
			},
			ready,
		);
		expect(retrieved.ok, resultFailureMessage(retrieved)).toBe(true);
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data.code).toBe(`SES-PAR-${suffix}`);

		const started = await startSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-start-ses-${suffix}`,
				sessionId: created.data.id,
				expectedVersion: created.data.version,
				actualStartsAt: "2025-06-01T09:05:00Z",
			},
			ready,
		);
		expect(started.ok, resultFailureMessage(started)).toBe(true);
		if (!started.ok) {
			return;
		}
		expect(started.data.status).toBe("in_progress");

		const completed = await completeSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-ses-${suffix}`,
				sessionId: started.data.id,
				expectedVersion: started.data.version,
				actualEndsAt: "2025-06-01T17:15:00Z",
			},
			ready,
		);
		expect(completed.ok, resultFailureMessage(completed)).toBe(true);
		if (!completed.ok) {
			return;
		}
		expect(completed.data.status).toBe("completed");
	});

	it("assignment with duplicate prevention", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `assign-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `ASSIGN-${suffix}`,
		});

		const assigned = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-assign-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: "2025-12-31",
			},
			ready,
		);
		expect(assigned.ok, resultFailureMessage(assigned)).toBe(true);
		if (!assigned.ok) {
			return;
		}
		expect(assigned.data.status).toBe("pending");

		const retrieved = await getLearningAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-assign-${suffix}`,
				assignmentId: assigned.data.id,
			},
			ready,
		);
		expect(retrieved.ok, resultFailureMessage(retrieved)).toBe(true);
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data.employeeId).toBe(employee.id);

		const duplicate = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-dup-assign-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(duplicate)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);

		const enroled = await enrolAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-enrol-${suffix}`,
				assignmentId: assigned.data.id,
				expectedVersion: assigned.data.version,
			},
			ready,
		);
		expect(enroled.ok, resultFailureMessage(enroled)).toBe(true);
		if (!enroled.ok) {
			return;
		}
		expect(enroled.data.status).toBe("in_progress");

		const waived = await waiveAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-waive-${suffix}`,
				assignmentId: enroled.data.id,
				expectedVersion: enroled.data.version,
			},
			ready,
		);
		expect(waived.ok, resultFailureMessage(waived)).toBe(true);
		if (!waived.ok) {
			return;
		}
		expect(waived.data.status).toBe("withdrawn");
	});

	it("completion recording with session link", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `comp-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `COMP-${suffix}`,
		});
		const session = await createSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-ses-${suffix}`,
				idempotencyKey: `idem-comp-ses-${suffix}`,
				courseId: course.id,
				code: `COMP-SES-${suffix}`,
				title: "Completion Session",
				scheduledStartsAt: "2025-07-01T09:00:00Z",
				scheduledEndsAt: "2025-07-01T17:00:00Z",
				capacity: null,
			},
			ready,
		);
		expect(session.ok, resultFailureMessage(session)).toBe(true);
		if (!session.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-assign-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-rec-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: session.data.id,
				completedAt: "2025-07-01T17:00:00Z",
				outcome: "attended",
				assessorUserId: ACTOR,
				notes: "Good participation",
			},
			ready,
		);
		expect(completion.ok, resultFailureMessage(completion)).toBe(true);
		if (!completion.ok) {
			return;
		}
		expect(completion.data.sessionId).toBe(session.data.id);

		const retrieved = await getCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-comp-${suffix}`,
				assignmentId: assignment.data.id,
			},
			ready,
		);
		expect(retrieved.ok, resultFailureMessage(retrieved)).toBe(true);
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data).not.toBeNull();
		if (retrieved.data === null) {
			return;
		}
		expect(retrieved.data.outcome).toBe("attended");
	});

	it("certification issuance and revocation", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `cert-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `CERT-${suffix}`,
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-assign-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-comp-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-08-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok, resultFailureMessage(completion)).toBe(true);
		if (!completion.ok) {
			return;
		}

		const certification = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-issue-${suffix}`,
				idempotencyKey: `idem-cert-issue-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: `CERT-PAR-${suffix}`,
				issuedOn: "2025-08-02",
				expiresOn: "2099-08-02",
			},
			ready,
		);
		expect(certification.ok, resultFailureMessage(certification)).toBe(true);
		if (!certification.ok) {
			return;
		}
		expect(certification.data.status).toBe("active");

		const retrieved = await getCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-get-cert-${suffix}`,
				certificationId: certification.data.id,
			},
			ready,
		);
		expect(retrieved.ok, resultFailureMessage(retrieved)).toBe(true);
		if (!retrieved.ok) {
			return;
		}
		expect(retrieved.data.certificationCode).toBe(`CERT-PAR-${suffix}`);

		const revoked = await revokeCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-revoke-${suffix}`,
				certificationId: certification.data.id,
				expectedVersion: certification.data.version,
			},
			ready,
		);
		expect(revoked.ok, resultFailureMessage(revoked)).toBe(true);
		if (!revoked.ok) {
			return;
		}
		expect(revoked.data.status).toBe("revoked");
	});

	it("certification expiration", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `cert-expire-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `CERT-EXP-${suffix}`,
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-exp-assign-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-exp-comp-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-08-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok, resultFailureMessage(completion)).toBe(true);
		if (!completion.ok) {
			return;
		}

		const certification = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-exp-issue-${suffix}`,
				idempotencyKey: `idem-cert-exp-issue-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: `CERT-EXP-${suffix}`,
				issuedOn: "2025-08-02",
				expiresOn: "2099-08-02",
			},
			ready,
		);
		expect(certification.ok, resultFailureMessage(certification)).toBe(true);
		if (!certification.ok) {
			return;
		}
		expect(certification.data.status).toBe("active");

		const expired = await expireCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-cert-expire-${suffix}`,
				certificationId: certification.data.id,
				expectedVersion: certification.data.version,
			},
			ready,
		);
		expect(expired.ok, resultFailureMessage(expired)).toBe(true);
		if (!expired.ok) {
			return;
		}
		expect(expired.data.status).toBe("expired");
	});

	it("lists courses with pagination", async () => {
		const ready = createHrParityHarness(adapter);
		await runSequential([1, 2, 3], async (i) => {
			await createCourse(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-list-${suffix}-${i}`,
					idempotencyKey: `idem-list-${suffix}-${i}`,
					code: `LIST-${suffix}-${i}`,
					title: `Course ${i}`,
					description: null,
					durationHours: null,
				},
				ready,
			);
		});

		const page = await listCourses(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-courses-${suffix}`,
			},
			ready,
		);
		expect(page.ok, resultFailureMessage(page)).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.courses.length).toBeGreaterThanOrEqual(3);
	});

	it("lists sessions for a course", async () => {
		const ready = createHrParityHarness(adapter);
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-SES-${suffix}`,
		});

		await runSequential([1, 2], async (i) => {
			await createSession(
				{
					organizationId: ORG,
					actorUserId: ACTOR,
					correlationId: `corr-list-ses-${suffix}-${i}`,
					idempotencyKey: `idem-list-ses-${suffix}-${i}`,
					courseId: course.id,
					code: `LST-SES-${suffix}-${i}`,
					title: `Session ${i}`,
					scheduledStartsAt: `2025-0${i}-15T09:00:00Z`,
					scheduledEndsAt: `2025-0${i}-15T17:00:00Z`,
					capacity: null,
				},
				ready,
			);
		});

		const page = await listSessions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-sessions-${suffix}`,
				courseId: course.id,
			},
			ready,
		);
		expect(page.ok, resultFailureMessage(page)).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.sessions.length).toBe(2);
	});

	it("lists assignments for an employee", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `list-assign-${suffix}`,
		});
		const course1 = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-A1-${suffix}`,
		});
		const course2 = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-A2-${suffix}`,
		});

		await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-a1-${suffix}`,
				employeeId: employee.id,
				courseId: course1.id,
				dueOn: null,
			},
			ready,
		);
		await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-a2-${suffix}`,
				employeeId: employee.id,
				courseId: course2.id,
				dueOn: null,
			},
			ready,
		);

		const page = await listLearningAssignments(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-assignments-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok, resultFailureMessage(page)).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.assignments.length).toBe(2);
	});

	it("lists completions for an employee", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `list-comp-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-COMP-${suffix}`,
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-comp-a-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-comp-r-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-09-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);

		const page = await listCompletions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-comps-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok, resultFailureMessage(page)).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.completions.length).toBe(1);
	});

	it("lists certifications for an employee", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `list-cert-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-CERT-${suffix}`,
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-cert-a-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-cert-c-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-10-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok, resultFailureMessage(completion)).toBe(true);
		if (!completion.ok) {
			return;
		}

		await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-cert-i-${suffix}`,
				idempotencyKey: `idem-list-cert-i-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: `LIST-CERT-${suffix}`,
				issuedOn: "2025-10-02",
				expiresOn: null,
			},
			ready,
		);

		const page = await listCertifications(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-certs-${suffix}`,
				employeeId: employee.id,
			},
			ready,
		);
		expect(page.ok, resultFailureMessage(page)).toBe(true);
		if (!page.ok) {
			return;
		}
		expect(page.data.certifications.length).toBe(1);
	});

	it("assigns session instructor and records learning attendance", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `slice97-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `SLICE97-${suffix}`,
		});
		const session = await createSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-s-${suffix}`,
				idempotencyKey: `idem-s97-s-${suffix}`,
				courseId: course.id,
				code: `S97-${suffix}`,
				title: "Slice 9.7 Session",
				scheduledStartsAt: "2025-08-01T09:00:00Z",
				scheduledEndsAt: "2025-08-01T17:00:00Z",
				capacity: 5,
				primaryInstructorUserId: "instructor-parity",
			},
			ready,
		);
		expect(session.ok, resultFailureMessage(session)).toBe(true);
		if (!session.ok) {
			return;
		}

		const instructed = await assignSessionInstructor(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-i-${suffix}`,
				sessionId: session.data.id,
				primaryInstructorUserId: "instructor-parity-2",
				expectedVersion: session.data.version,
			},
			ready,
		);
		expect(instructed.ok, resultFailureMessage(instructed)).toBe(true);
		if (!instructed.ok) {
			return;
		}

		const started = await startSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-start-${suffix}`,
				sessionId: instructed.data.id,
				expectedVersion: instructed.data.version,
			},
			ready,
		);
		expect(started.ok, resultFailureMessage(started)).toBe(true);
		if (!started.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-a-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: started.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const enrolled = await enrolAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-e-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(enrolled.ok, resultFailureMessage(enrolled)).toBe(true);
		if (!enrolled.ok) {
			return;
		}

		const attendance = await recordLearningAttendance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-att-${suffix}`,
				idempotencyKey: `idem-s97-att-${suffix}`,
				sessionId: started.data.id,
				assignmentId: enrolled.data.id,
				status: "present",
				recordedAt: "2025-08-01T10:00:00Z",
			},
			ready,
		);
		expect(attendance.ok, resultFailureMessage(attendance)).toBe(true);
		if (!attendance.ok) {
			return;
		}

		const listed = await listLearningAttendance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-s97-list-att-${suffix}`,
				sessionId: started.data.id,
			},
			ready,
		);
		expect(listed.ok, resultFailureMessage(listed)).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.attendanceRecords.length).toBe(1);
	});

	it("renews expired certification", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await seedEmployee(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `renew-${suffix}`,
		});
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `RENEW-${suffix}`,
		});
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-a-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok, resultFailureMessage(assignment)).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-c-${suffix}`,
				assignmentId: assignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2024-05-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(completion.ok, resultFailureMessage(completion)).toBe(true);
		if (!completion.ok) {
			return;
		}

		const issued = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-i-${suffix}`,
				idempotencyKey: `idem-renew-i-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				completionId: completion.data.id,
				certificationCode: `RENEW-${suffix}`,
				issuedOn: "2024-05-02",
				expiresOn: "2025-05-02",
			},
			ready,
		);
		expect(issued.ok, resultFailureMessage(issued)).toBe(true);
		if (!issued.ok) {
			return;
		}

		const expired = await expireCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-x-${suffix}`,
				certificationId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(expired.ok, resultFailureMessage(expired)).toBe(true);
		if (!expired.ok) {
			return;
		}

		const renewalAssignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-a2-${suffix}`,
				employeeId: employee.id,
				courseId: course.id,
				dueOn: null,
			},
			ready,
		);
		expect(renewalAssignment.ok, resultFailureMessage(renewalAssignment)).toBe(
			true,
		);
		if (!renewalAssignment.ok) {
			return;
		}

		const renewalCompletion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-c2-${suffix}`,
				assignmentId: renewalAssignment.data.id,
				employeeId: employee.id,
				courseId: course.id,
				sessionId: null,
				completedAt: "2025-06-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
			},
			ready,
		);
		expect(renewalCompletion.ok, resultFailureMessage(renewalCompletion)).toBe(
			true,
		);
		if (!renewalCompletion.ok) {
			return;
		}

		const renewed = await renewCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-renew-r-${suffix}`,
				idempotencyKey: `idem-renew-r-${suffix}`,
				certificationId: expired.data.id,
				completionId: renewalCompletion.data.id,
				certificationCode: `RENEW2-${suffix}`,
				issuedOn: "2025-06-02",
				expiresOn: "2099-06-02",
				expectedVersion: expired.data.version,
			},
			ready,
		);
		expect(renewed.ok, resultFailureMessage(renewed)).toBe(true);
		if (!renewed.ok) {
			return;
		}
		expect(renewed.data.renewedFromCertificationId).toBe(expired.data.id);
	});
}

describe("Learning parity [memory]", () => {
	defineLearningParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)("Learning parity [drizzle]", () => {
	defineLearningParitySuite("drizzle");
});
