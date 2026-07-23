/**
 * HR Time Server Actions — permission deny, org stamp, Result→ActionResult.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-time-operator",
	orgId: "org-hr-time-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrTimeMocks = vi.hoisted(() => ({
	activateTimePolicy: vi.fn(),
	approveAttendanceBreakWaiver: vi.fn(),
	approveTimesheet: vi.fn(),
	assignTimeApprovalAuthority: vi.fn(),
	assignTimePolicy: vi.fn(),
	createWorkCalendar: vi.fn(),
	createTimePolicy: vi.fn(),
	endTimeApprovalAuthorityAssignment: vi.fn(),
	publishShiftAssignment: vi.fn(),
	reopenTimesheet: vi.fn(),
	returnTimesheet: vi.fn(),
	resolveAttendanceSession: vi.fn(),
	resolveAttendanceException: vi.fn(),
	generateTimesheetEntries: vi.fn(),
	importAttendanceEvents: vi.fn(),
	lockTimesheet: vi.fn(),
	createOvertimeRequest: vi.fn(),
	createShift: vi.fn(),
	supersedeShift: vi.fn(),
	supersedeTimePolicy: vi.fn(),
	supersedeWorkCalendar: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-time-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		activateTimePolicy: hrTimeMocks.activateTimePolicy,
		approveAttendanceBreakWaiver: hrTimeMocks.approveAttendanceBreakWaiver,
		approveTimesheet: hrTimeMocks.approveTimesheet,
		assignTimeApprovalAuthority: hrTimeMocks.assignTimeApprovalAuthority,
		assignTimePolicy: hrTimeMocks.assignTimePolicy,
		createWorkCalendar: hrTimeMocks.createWorkCalendar,
		createTimePolicy: hrTimeMocks.createTimePolicy,
		endTimeApprovalAuthorityAssignment:
			hrTimeMocks.endTimeApprovalAuthorityAssignment,
		publishShiftAssignment: hrTimeMocks.publishShiftAssignment,
		resolveAttendanceException: hrTimeMocks.resolveAttendanceException,
		importAttendanceEvents: hrTimeMocks.importAttendanceEvents,
		generateTimesheetEntries: hrTimeMocks.generateTimesheetEntries,
		createOvertimeRequest: hrTimeMocks.createOvertimeRequest,
		createShift: hrTimeMocks.createShift,
		supersedeShift: hrTimeMocks.supersedeShift,
		supersedeTimePolicy: hrTimeMocks.supersedeTimePolicy,
		supersedeWorkCalendar: hrTimeMocks.supersedeWorkCalendar,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
		identityResolver: {},
		workCalendar: {},
		approvedLeave: {},
		documentReference: {},
	}),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import {
	activateTimePolicyAction,
	approveAttendanceBreakWaiverAction,
	approveTimesheetAction,
	assignTimeApprovalAuthorityAction,
	assignTimePolicyAction,
	createOvertimeRequestAction,
	createTimePolicyAction,
	createWorkCalendarAction,
	endTimeApprovalAuthorityAssignmentAction,
	generateTimesheetEntriesAction,
	importAttendanceEventsAction,
	publishShiftAssignmentAction,
	resolveAttendanceExceptionAction,
	supersedeShiftAction,
	supersedeTimePolicyAction,
	supersedeWorkCalendarAction,
} from "../app/actions/hr-time";

const sampleWorkWeek = [
	{
		dayOfWeek: 0 as const,
		isWorkingDay: false,
		standardStartTime: null,
		standardEndTime: null,
		standardMinutes: null,
	},
	{
		dayOfWeek: 1 as const,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 2 as const,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 3 as const,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 4 as const,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 5 as const,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 6 as const,
		isWorkingDay: false,
		standardStartTime: null,
		standardEndTime: null,
		standardMinutes: null,
	},
];

describe("hr-time Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("gates approveTimesheetAction on human-resources.time.timesheet.approve", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to approve timesheets.",
		});

		const result = await approveTimesheetAction({
			timesheetId: "11111111-1111-4111-8111-111111111111",
			expectedVersion: 1,
			authority: "line_manager",
		});

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "You do not have permission to approve timesheets.",
		});
		expect(hrTimeMocks.approveTimesheet).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.timesheet.approve",
		);
	});

	it("stamps session org on approveTimesheetAction and maps package success", async () => {
		hrTimeMocks.approveTimesheet.mockResolvedValue({
			ok: true,
			data: {
				id: "11111111-1111-4111-8111-111111111111",
				organizationId: "org-hr-time-active",
				status: "approved",
				version: 2,
			},
		});

		const result = await approveTimesheetAction({
			timesheetId: "11111111-1111-4111-8111-111111111111",
			expectedVersion: 1,
			authority: "line_manager",
		});

		expect(result.ok).toBe(true);
		expect(hrTimeMocks.approveTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				timesheetId: "11111111-1111-4111-8111-111111111111",
				authority: "line_manager",
				expectedVersion: 1,
				correlationId: "corr-hr-time-test",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("gates createWorkCalendarAction on human-resources.time.calendar.manage", async () => {
		hrTimeMocks.createWorkCalendar.mockResolvedValue({
			ok: true,
			data: { id: "22222222-2222-4222-8222-222222222222", version: 1 },
		});

		const result = await createWorkCalendarAction({
			idempotencyKey: "cal-1",
			code: "STD",
			name: "Standard",
			timezone: "Asia/Singapore",
			calendarVersion: "2026",
			workWeek: sampleWorkWeek,
			standardHoursPerDay: "8.00",
			effectiveFrom: "2026-01-01",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.calendar.manage",
		);
		expect(hrTimeMocks.createWorkCalendar).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				code: "STD",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("stamps session context on work calendar supersession", async () => {
		hrTimeMocks.supersedeWorkCalendar.mockResolvedValue({
			ok: true,
			data: {
				superseded: {
					id: "22222222-2222-4222-8222-222222222222",
					status: "superseded",
				},
				successor: {
					id: "22222222-2222-4222-8222-222222222223",
					status: "active",
				},
			},
		});

		const result = await supersedeWorkCalendarAction({
			idempotencyKey: "cal-successor-1",
			calendarId: "22222222-2222-4222-8222-222222222222",
			expectedVersion: 1,
			calendarVersion: "2027",
			effectiveFrom: "2027-01-01",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.calendar.manage",
		);
		expect(hrTimeMocks.supersedeWorkCalendar).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				calendarId: "22222222-2222-4222-8222-222222222222",
				effectiveFrom: "2027-01-01",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("gates and stamps Time policy creation", async () => {
		hrTimeMocks.createTimePolicy.mockResolvedValue({
			ok: true,
			data: {
				id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				status: "draft",
				version: 1,
			},
		});

		const result = await createTimePolicyAction({
			idempotencyKey: "time-policy-1",
			code: "STANDARD",
			name: "Standard Time Policy",
			effectiveFrom: "2026-01-01",
			minimumRestMinutes: 660,
			automaticBreakAfterMinutes: 300,
			automaticBreakMinutes: 60,
			approvalSteps: ["line_manager", "hr"],
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.calendar.manage",
		);
		expect(hrTimeMocks.createTimePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				correlationId: "corr-hr-time-test",
				code: "STANDARD",
				approvalSteps: ["line_manager", "hr"],
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("exposes activation, supersession, and employment assignment for Time policies", async () => {
		const policyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const successorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab";
		hrTimeMocks.activateTimePolicy.mockResolvedValue({
			ok: true,
			data: { id: policyId, status: "active", version: 2 },
		});
		hrTimeMocks.supersedeTimePolicy.mockResolvedValue({
			ok: true,
			data: {
				superseded: { id: policyId, status: "superseded", version: 3 },
				successor: { id: successorId, status: "active", version: 1 },
			},
		});
		hrTimeMocks.assignTimePolicy.mockResolvedValue({
			ok: true,
			data: {
				id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				policyId: successorId,
				version: 1,
			},
		});

		const activated = await activateTimePolicyAction({
			policyId,
			expectedVersion: 1,
		});
		const superseded = await supersedeTimePolicyAction({
			idempotencyKey: "time-policy-successor-1",
			policyId,
			expectedVersion: 2,
			name: "Standard Time Policy v2",
			effectiveFrom: "2027-01-01",
			minimumRestMinutes: 720,
			automaticBreakAfterMinutes: 300,
			automaticBreakMinutes: 45,
			approvalSteps: ["line_manager", "hr"],
		});
		const assigned = await assignTimePolicyAction({
			policyId: successorId,
			employmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			effectiveFrom: "2027-01-01",
		});

		expect(activated.ok).toBe(true);
		expect(superseded.ok).toBe(true);
		expect(assigned.ok).toBe(true);
		expect(hrTimeMocks.activateTimePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				policyId,
			}),
			expect.anything(),
		);
		expect(hrTimeMocks.supersedeTimePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				policyId,
				effectiveFrom: "2027-01-01",
			}),
			expect.anything(),
		);
		expect(hrTimeMocks.assignTimePolicy).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				policyId: successorId,
				employmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			}),
			expect.anything(),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledTimes(3);
		for (const call of permissionMocks.forbidUnlessPermission.mock.calls) {
			expect(call).toEqual([
				operatorSession,
				"human-resources.time.calendar.manage",
			]);
		}
	});

	it("exposes effective-dated Time approval-authority administration", async () => {
		const assignmentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		hrTimeMocks.assignTimeApprovalAuthority.mockResolvedValue({
			ok: true,
			data: { id: assignmentId, authority: "hr", version: 1 },
		});
		hrTimeMocks.endTimeApprovalAuthorityAssignment.mockResolvedValue({
			ok: true,
			data: {
				id: assignmentId,
				authority: "hr",
				effectiveTo: "2026-12-31",
				version: 2,
			},
		});

		const assigned = await assignTimeApprovalAuthorityAction({
			targetActorUserId: "user-hr-approver",
			authority: "hr",
			effectiveFrom: "2026-01-01",
		});
		const ended = await endTimeApprovalAuthorityAssignmentAction({
			assignmentId,
			effectiveTo: "2026-12-31",
			expectedVersion: 1,
		});

		expect(assigned.ok).toBe(true);
		expect(ended.ok).toBe(true);
		expect(hrTimeMocks.assignTimeApprovalAuthority).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				targetActorUserId: "user-hr-approver",
				authority: "hr",
			}),
			expect.anything(),
		);
		expect(hrTimeMocks.endTimeApprovalAuthorityAssignment).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				assignmentId,
				effectiveTo: "2026-12-31",
			}),
			expect.anything(),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledTimes(2);
	});

	it("gates and stamps attendance break-waiver approval", async () => {
		hrTimeMocks.approveAttendanceBreakWaiver.mockResolvedValue({
			ok: true,
			data: {
				id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				authority: "line_manager",
			},
		});

		const result = await approveAttendanceBreakWaiverAction({
			sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
			authority: "line_manager",
			reason: "Operational evidence reviewed",
			evidenceReference: "evidence://break-waiver/2026-07-23",
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.attendance.correct",
		);
		expect(hrTimeMocks.approveAttendanceBreakWaiver).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				authority: "line_manager",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies every new Time administration Action before package invocation", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Time administration is not permitted.",
		});
		const policyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const assignmentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		const policyInput = {
			idempotencyKey: "time-policy-denied",
			name: "Denied Policy",
			effectiveFrom: "2027-01-01",
			minimumRestMinutes: 660,
			approvalSteps: ["line_manager"] as const,
		};
		const cases = [
			{
				invoke: () =>
					createTimePolicyAction({
						...policyInput,
						approvalSteps: [...policyInput.approvalSteps],
						code: "DENIED",
					}),
				mock: hrTimeMocks.createTimePolicy,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					activateTimePolicyAction({ policyId, expectedVersion: 1 }),
				mock: hrTimeMocks.activateTimePolicy,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					supersedeTimePolicyAction({
						...policyInput,
						approvalSteps: [...policyInput.approvalSteps],
						policyId,
						expectedVersion: 1,
					}),
				mock: hrTimeMocks.supersedeTimePolicy,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					assignTimePolicyAction({
						policyId,
						employmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
						effectiveFrom: "2027-01-01",
					}),
				mock: hrTimeMocks.assignTimePolicy,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					assignTimeApprovalAuthorityAction({
						targetActorUserId: "user-denied-approver",
						authority: "hr",
						effectiveFrom: "2027-01-01",
					}),
				mock: hrTimeMocks.assignTimeApprovalAuthority,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					endTimeApprovalAuthorityAssignmentAction({
						assignmentId,
						effectiveTo: "2027-12-31",
						expectedVersion: 1,
					}),
				mock: hrTimeMocks.endTimeApprovalAuthorityAssignment,
				permission: "human-resources.time.calendar.manage",
			},
			{
				invoke: () =>
					approveAttendanceBreakWaiverAction({
						sessionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
						authority: "line_manager",
						reason: "Denied waiver",
						evidenceReference: "evidence://break-waiver/denied",
						expectedVersion: 1,
					}),
				mock: hrTimeMocks.approveAttendanceBreakWaiver,
				permission: "human-resources.time.attendance.correct",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Time administration is not permitted.",
			});
			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Time administration is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("rejects invalid policy, authority, and waiver inputs at the Action boundary", async () => {
		const invalidPolicy = await createTimePolicyAction({
			idempotencyKey: "invalid-policy",
			code: "INVALID",
			name: "Invalid Policy",
			effectiveFrom: "not-a-date",
			minimumRestMinutes: 660,
			approvalSteps: ["line_manager", "line_manager"],
		});
		const invalidAuthority = await endTimeApprovalAuthorityAssignmentAction({
			assignmentId: "not-a-uuid",
			effectiveTo: "2027-12-31",
			expectedVersion: 1,
		});
		const invalidWaiver = await approveAttendanceBreakWaiverAction({
			sessionId: "not-a-uuid",
			authority: "line_manager",
			reason: "Invalid waiver",
			evidenceReference: "evidence://invalid",
			expectedVersion: 1,
		});

		for (const result of [invalidPolicy, invalidAuthority, invalidWaiver]) {
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrTimeMocks.createTimePolicy).not.toHaveBeenCalled();
		expect(
			hrTimeMocks.endTimeApprovalAuthorityAssignment,
		).not.toHaveBeenCalled();
		expect(hrTimeMocks.approveAttendanceBreakWaiver).not.toHaveBeenCalled();
	});

	it("stamps session context on shift supersession", async () => {
		hrTimeMocks.supersedeShift.mockResolvedValue({
			ok: true,
			data: {
				superseded: {
					id: "33333333-3333-4333-8333-333333333331",
					status: "superseded",
				},
				successor: {
					id: "33333333-3333-4333-8333-333333333332",
					status: "active",
				},
			},
		});

		const result = await supersedeShiftAction({
			idempotencyKey: "shift-successor-1",
			shiftId: "33333333-3333-4333-8333-333333333331",
			expectedVersion: 2,
			effectiveFrom: "2027-01-01",
			expectedMinutes: 450,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.shift.manage",
		);
		expect(hrTimeMocks.supersedeShift).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				shiftId: "33333333-3333-4333-8333-333333333331",
				effectiveFrom: "2027-01-01",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("gates publishShiftAssignmentAction on human-resources.time.schedule.publish", async () => {
		hrTimeMocks.publishShiftAssignment.mockResolvedValue({
			ok: true,
			data: { id: "33333333-3333-4333-8333-333333333333", version: 2 },
		});

		const result = await publishShiftAssignmentAction({
			assignmentId: "33333333-3333-4333-8333-333333333333",
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.schedule.publish",
		);
	});

	it("gates resolveAttendanceExceptionAction on human-resources.time.exception.resolve", async () => {
		hrTimeMocks.resolveAttendanceException.mockResolvedValue({
			ok: true,
			data: { id: "44444444-4444-4444-8444-444444444444", version: 2 },
		});

		const result = await resolveAttendanceExceptionAction({
			exceptionId: "44444444-4444-4444-8444-444444444444",
			resolution: "Excused late arrival",
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.exception.resolve",
		);
	});

	it("gates generateTimesheetEntriesAction on human-resources.time.timesheet.self.edit", async () => {
		hrTimeMocks.generateTimesheetEntries.mockResolvedValue({
			ok: true,
			data: {
				timesheet: { id: "55555555-5555-4555-8555-555555555555", version: 2 },
				entries: [],
			},
		});

		const result = await generateTimesheetEntriesAction({
			timesheetId: "55555555-5555-4555-8555-555555555555",
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.timesheet.self.edit",
		);
	});

	it("gates createOvertimeRequestAction on human-resources.time.overtime.request", async () => {
		hrTimeMocks.createOvertimeRequest.mockResolvedValue({
			ok: true,
			data: { id: "66666666-6666-4666-8666-666666666666", version: 1 },
		});

		const result = await createOvertimeRequestAction({
			idempotencyKey: "ot-1",
			employeeId: "77777777-7777-4777-8777-777777777777",
			overtimeType: "weekday_overtime",
			requestedStartsAt: "2026-07-01T18:00:00+08:00",
			requestedEndsAt: "2026-07-01T20:00:00+08:00",
			requestedMinutes: 120,
			reason: "Month-end close",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.overtime.request",
		);
	});

	it("gates importAttendanceEventsAction on human-resources.time.attendance.manage", async () => {
		hrTimeMocks.importAttendanceEvents.mockResolvedValue({
			ok: true,
			data: {
				status: "completed",
				totals: { accepted: 1, skipped: 0, rejected: 0 },
			},
		});

		const result = await importAttendanceEventsAction({
			idempotencyKey: "import-1",
			batchId: "batch-1",
			sourceKey: "device-a",
			events: [
				{
					employeeId: "77777777-7777-4777-8777-777777777777",
					eventType: "clock_in",
					occurredAt: "2026-07-01T09:00:00+08:00",
					sourceTimezone: "Asia/Singapore",
					localWorkDate: "2026-07-01",
					sourceReference: "ref-1",
				},
			],
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.attendance.manage",
		);
	});

	it("maps package failure from approveTimesheetAction", async () => {
		hrTimeMocks.approveTimesheet.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Timesheet version conflict",
		});

		const result = await approveTimesheetAction({
			timesheetId: "11111111-1111-4111-8111-111111111111",
			expectedVersion: 1,
			authority: "line_manager",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
		}
	});
});
