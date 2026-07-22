/**
 * Memory vs Drizzle parity for learning & certification (HR-06).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createEmployee } from "../src/core/employee";
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
	cancelSession,
	completeSession,
	createSession,
	getSession,
	listSessions,
	startSession,
} from "../src/learning/learning-session";
import {
	getCompletion,
	listCompletions,
	recordCompletion,
} from "../src/learning/completion";
import {
	getCertification,
	issueCertification,
	listCertifications,
	revokeCertification,
} from "../src/learning/certification";
import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	createWorkforceHarness,
	type WorkforceStoreAdapter,
} from "./helpers/workforce-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedEmployee(
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
	return employee.data;
}

async function seedCourse(
	ready: ReturnType<typeof createWorkforceHarness>,
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
	const ORG = `org-hr-learn-parity-${suffix}`;
	const ACTOR = `user-hr-learn-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("course CRUD with status transitions", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(created.ok).toBe(true);
		if (!created.ok) return;
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
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
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
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
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
		expect(archived.ok).toBe(true);
		if (!archived.ok) return;
		expect(archived.data.status).toBe("archived");
	});

	it("session lifecycle with time tracking", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(created.ok).toBe(true);
		if (!created.ok) return;
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
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
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
		expect(started.ok).toBe(true);
		if (!started.ok) return;
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
		expect(completed.ok).toBe(true);
		if (!completed.ok) return;
		expect(completed.data.status).toBe("completed");
	});

	it("assignment with duplicate prevention", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) return;
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
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
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
		if (duplicate.ok) return;
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
		expect(enroled.ok).toBe(true);
		if (!enroled.ok) return;
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
		expect(waived.ok).toBe(true);
		if (!waived.ok) return;
		expect(waived.data.status).toBe("withdrawn");
	});

	it("completion recording with session link", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(session.ok).toBe(true);
		if (!session.ok) return;

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
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

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
		expect(completion.ok).toBe(true);
		if (!completion.ok) return;
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
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
		expect(retrieved.data).not.toBeNull();
		if (retrieved.data === null) return;
		expect(retrieved.data.outcome).toBe("attended");
	});

	it("certification issuance and revocation", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

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
		expect(completion.ok).toBe(true);
		if (!completion.ok) return;

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
				expiresOn: "2026-08-02",
			},
			ready,
		);
		expect(certification.ok).toBe(true);
		if (!certification.ok) return;
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
		expect(retrieved.ok).toBe(true);
		if (!retrieved.ok) return;
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
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) return;
		expect(revoked.data.status).toBe("revoked");
	});

	it("lists courses with pagination", async () => {
		const ready = createWorkforceHarness(adapter);
		for (let i = 1; i <= 3; i++) {
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
		}

		const page = await listCourses(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-courses-${suffix}`,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.courses.length).toBeGreaterThanOrEqual(3);
	});

	it("lists sessions for a course", async () => {
		const ready = createWorkforceHarness(adapter);
		const course = await seedCourse(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `LIST-SES-${suffix}`,
		});

		for (let i = 1; i <= 2; i++) {
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
		}

		const page = await listSessions(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-list-sessions-${suffix}`,
				courseId: course.id,
			},
			ready,
		);
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.sessions.length).toBe(2);
	});

	it("lists assignments for an employee", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.assignments.length).toBe(2);
	});

	it("lists completions for an employee", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

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
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.completions.length).toBe(1);
	});

	it("lists certifications for an employee", async () => {
		const ready = createWorkforceHarness(adapter);
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
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) return;

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
		expect(completion.ok).toBe(true);
		if (!completion.ok) return;

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
		expect(page.ok).toBe(true);
		if (!page.ok) return;
		expect(page.data.certifications.length).toBe(1);
	});
}

describe("Learning parity [memory]", () => {
	defineLearningParitySuite("memory");
});

describe.skipIf(!hasDatabase)("Learning parity [drizzle]", () => {
	defineLearningParitySuite("drizzle");
});
