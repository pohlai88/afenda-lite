/**
 * HR Learning Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-learn-operator",
	orgId: "org-hr-learn-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrLearningMocks = vi.hoisted(() => ({
	activateCourse: vi.fn(),
	archiveCourse: vi.fn(),
	assignLearning: vi.fn(),
	assignSessionInstructor: vi.fn(),
	cancelSession: vi.fn(),
	completeSession: vi.fn(),
	createCourse: vi.fn(),
	createSession: vi.fn(),
	enrolAssignment: vi.fn(),
	expireCertification: vi.fn(),
	issueCertification: vi.fn(),
	listCertifications: vi.fn(),
	listCompletions: vi.fn(),
	listCourses: vi.fn(),
	listLearningAssignments: vi.fn(),
	listLearningAttendance: vi.fn(),
	listSessions: vi.fn(),
	recordCompletion: vi.fn(),
	recordLearningAttendance: vi.fn(),
	renewCertification: vi.fn(),
	revokeCertification: vi.fn(),
	startSession: vi.fn(),
	waiveAssignment: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-learn-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrLearningMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	activateCourseAction,
	archiveCourseAction,
	assignLearningAction,
	assignSessionInstructorAction,
	cancelSessionAction,
	completeSessionAction,
	createCourseAction,
	createSessionAction,
	enrolLearningAssignmentAction,
	expireCertificationAction,
	issueCertificationAction,
	listCertificationsAction,
	listCoursesAction,
	listLearningAssignmentsAction,
	listLearningAttendanceAction,
	listLearningCompletionsAction,
	listSessionsAction,
	recordLearningAttendanceAction,
	recordLearningCompletionAction,
	renewCertificationAction,
	revokeCertificationAction,
	startSessionAction,
	waiveLearningAssignmentAction,
} from "../app/actions/hr-learning";

const employeeId = "11111111-1111-4111-8111-111111111111";
const courseId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
const assignmentId = "44444444-4444-4444-8444-444444444444";
const completionId = "55555555-5555-4555-8555-555555555555";
const certificationId = "66666666-6666-4666-8666-666666666666";

describe("HR Learning Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrLearningMocks.createCourse.mockResolvedValue({
			ok: true,
			data: { id: courseId, status: "active", version: 1 },
		});
		hrLearningMocks.startSession.mockResolvedValue({
			ok: true,
			data: { id: sessionId, status: "in_progress", version: 2 },
		});
		hrLearningMocks.issueCertification.mockResolvedValue({
			ok: true,
			data: { id: certificationId, status: "active", version: 1 },
		});
		hrLearningMocks.expireCertification.mockResolvedValue({
			ok: true,
			data: { id: certificationId, status: "expired", version: 2 },
		});
	});

	it("denies learning Actions before package invocation", async () => {
		const cases = [
			{
				invoke: () =>
					createCourseAction({
						idempotencyKey: "idem-course-denied",
						code: "SAFETY",
						title: "Safety Training",
					}),
				mock: hrLearningMocks.createCourse,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					archiveCourseAction({
						courseId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.archiveCourse,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					activateCourseAction({
						courseId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.activateCourse,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () => listCoursesAction({}),
				mock: hrLearningMocks.listCourses,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					createSessionAction({
						idempotencyKey: "idem-session-denied",
						courseId,
						code: "SES-1",
						title: "Session 1",
						scheduledStartsAt: "2026-06-01T09:00:00Z",
						scheduledEndsAt: "2026-06-01T17:00:00Z",
					}),
				mock: hrLearningMocks.createSession,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () => listSessionsAction({ courseId }),
				mock: hrLearningMocks.listSessions,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					startSessionAction({
						sessionId,
						expectedVersion: 1,
						actualStartsAt: "2026-06-01T09:05:00Z",
					}),
				mock: hrLearningMocks.startSession,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					completeSessionAction({
						sessionId,
						expectedVersion: 2,
						actualEndsAt: "2026-06-01T17:10:00Z",
					}),
				mock: hrLearningMocks.completeSession,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					cancelSessionAction({
						sessionId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.cancelSession,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					assignSessionInstructorAction({
						sessionId,
						primaryInstructorUserId: "instructor-user-1",
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.assignSessionInstructor,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					recordLearningAttendanceAction({
						idempotencyKey: "idem-attendance-denied",
						sessionId,
						assignmentId,
						status: "present",
						recordedAt: "2026-06-01T09:30:00Z",
					}),
				mock: hrLearningMocks.recordLearningAttendance,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () => listLearningAttendanceAction({ sessionId }),
				mock: hrLearningMocks.listLearningAttendance,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					assignLearningAction({
						employeeId,
						courseId,
					}),
				mock: hrLearningMocks.assignLearning,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					enrolLearningAssignmentAction({
						assignmentId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.enrolAssignment,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					waiveLearningAssignmentAction({
						assignmentId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.waiveAssignment,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () => listLearningAssignmentsAction({ employeeId }),
				mock: hrLearningMocks.listLearningAssignments,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					recordLearningCompletionAction({
						assignmentId,
						completedAt: "2026-06-01T17:00:00Z",
						outcome: "passed",
					}),
				mock: hrLearningMocks.recordCompletion,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () => listLearningCompletionsAction({ employeeId }),
				mock: hrLearningMocks.listCompletions,
				permission: "human-resources.learning.manage",
			},
			{
				invoke: () =>
					issueCertificationAction({
						idempotencyKey: "idem-cert-denied",
						employeeId,
						courseId,
						completionId,
						certificationCode: "CERT-1",
						issuedOn: "2026-06-02",
					}),
				mock: hrLearningMocks.issueCertification,
				permission: "human-resources.certification.manage",
			},
			{
				invoke: () =>
					revokeCertificationAction({
						certificationId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.revokeCertification,
				permission: "human-resources.certification.manage",
			},
			{
				invoke: () =>
					expireCertificationAction({
						certificationId,
						expectedVersion: 1,
					}),
				mock: hrLearningMocks.expireCertification,
				permission: "human-resources.certification.manage",
			},
			{
				invoke: () =>
					renewCertificationAction({
						idempotencyKey: "idem-renew-denied",
						certificationId,
						completionId,
						certificationCode: "CERT-1",
						issuedOn: "2026-06-03",
						expectedVersion: 2,
					}),
				mock: hrLearningMocks.renewCertification,
				permission: "human-resources.certification.manage",
			},
			{
				invoke: () => listCertificationsAction({ employeeId }),
				mock: hrLearningMocks.listCertifications,
				permission: "human-resources.certification.manage",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			authMocks.requireRole.mockResolvedValue(operatorSession);
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Learning is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Learning is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("rejects issueCertificationAction without completionId", async () => {
		const result = await issueCertificationAction({
			idempotencyKey: "idem-cert-invalid",
			employeeId,
			courseId,
			completionId: "not-a-uuid",
			certificationCode: "CERT-1",
			issuedOn: "2026-06-02",
		});

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(hrLearningMocks.issueCertification).not.toHaveBeenCalled();
	});

	it("stamps org and actor on createCourseAction", async () => {
		const result = await createCourseAction({
			idempotencyKey: "idem-course-1",
			code: "SAFETY",
			title: "Safety Training",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.learning.manage",
		);
		expect(hrLearningMocks.createCourse).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-learn-test",
				code: "SAFETY",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates startSessionAction to package with learning.manage", async () => {
		const result = await startSessionAction({
			sessionId,
			expectedVersion: 1,
			actualStartsAt: "2026-06-01T09:05:00Z",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.learning.manage",
		);
		expect(hrLearningMocks.startSession).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				sessionId,
				expectedVersion: 1,
				actualStartsAt: "2026-06-01T09:05:00Z",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates issueCertificationAction with completionId", async () => {
		const result = await issueCertificationAction({
			idempotencyKey: "idem-cert-1",
			employeeId,
			courseId,
			completionId,
			certificationCode: "CERT-1",
			issuedOn: "2026-06-02",
			expiresOn: "2027-06-02",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.certification.manage",
		);
		expect(hrLearningMocks.issueCertification).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				completionId,
				certificationCode: "CERT-1",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("delegates expireCertificationAction with certification.manage", async () => {
		const result = await expireCertificationAction({
			certificationId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.certification.manage",
		);
		expect(hrLearningMocks.expireCertification).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				certificationId,
				expectedVersion: 1,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
