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
	approveTimesheet: vi.fn(),
	createWorkCalendar: vi.fn(),
	publishShiftAssignment: vi.fn(),
	resolveAttendanceException: vi.fn(),
	generateTimesheetEntries: vi.fn(),
	createOvertimeRequest: vi.fn(),
	createShift: vi.fn(),
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
	const actual = await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		approveTimesheet: hrTimeMocks.approveTimesheet,
		createWorkCalendar: hrTimeMocks.createWorkCalendar,
		publishShiftAssignment: hrTimeMocks.publishShiftAssignment,
		resolveAttendanceException: hrTimeMocks.resolveAttendanceException,
		generateTimesheetEntries: hrTimeMocks.generateTimesheetEntries,
		createOvertimeRequest: hrTimeMocks.createOvertimeRequest,
		createShift: hrTimeMocks.createShift,
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
	approveTimesheetAction,
	createOvertimeRequestAction,
	createWorkCalendarAction,
	generateTimesheetEntriesAction,
	publishShiftAssignmentAction,
	resolveAttendanceExceptionAction,
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
		});

		expect(result.ok).toBe(true);
		expect(hrTimeMocks.approveTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-hr-time-active",
				actorUserId: "user-hr-time-operator",
				timesheetId: "11111111-1111-4111-8111-111111111111",
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

	it("maps package failure from approveTimesheetAction", async () => {
		hrTimeMocks.approveTimesheet.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message: "Timesheet version conflict",
		});

		const result = await approveTimesheetAction({
			timesheetId: "11111111-1111-4111-8111-111111111111",
			expectedVersion: 1,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("CONFLICT");
		}
	});
});
