/**
 * HR Organization Server Actions — permission deny, org stamp, calendar assign.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-organization-operator",
	orgId: "org-hr-organization-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrOrganizationMocks = vi.hoisted(() => ({
	createDepartment: vi.fn(),
	getOrganizationTree: vi.fn(),
	assignEmploymentCalendar: vi.fn(),
	resolveEmployeeWorkCalendar: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-organization-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createDepartment: hrOrganizationMocks.createDepartment,
		getOrganizationTree: hrOrganizationMocks.getOrganizationTree,
		assignEmploymentCalendar: hrOrganizationMocks.assignEmploymentCalendar,
		resolveEmployeeWorkCalendar:
			hrOrganizationMocks.resolveEmployeeWorkCalendar,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	assignEmploymentCalendarAction,
	createDepartmentAction,
	getOrganizationTreeAction,
	resolveEmployeeWorkCalendarAction,
} from "../app/actions/hr-organization";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const calendarId = "44444444-4444-4444-8444-444444444444";

describe("HR Organization Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrOrganizationMocks.createDepartment.mockResolvedValue({
			ok: true,
			data: { id: "dept-1", code: "ENG", name: "Engineering" },
		});
		hrOrganizationMocks.getOrganizationTree.mockResolvedValue({
			ok: true,
			data: { nodes: [] },
		});
		hrOrganizationMocks.assignEmploymentCalendar.mockResolvedValue({
			ok: true,
			data: { id: "cal-assign-1", calendarId },
		});
		hrOrganizationMocks.resolveEmployeeWorkCalendar.mockResolvedValue({
			ok: true,
			data: { calendarId, employeeId },
		});
	});

	it("denies createDepartmentAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createDepartmentAction({
			code: "ENG",
			name: "Engineering",
		});

		expect(result.ok).toBe(false);
		expect(hrOrganizationMocks.createDepartment).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.organization.manage",
		);
	});

	it("stamps org and actor on createDepartmentAction", async () => {
		const result = await createDepartmentAction({
			code: "ENG",
			name: "Engineering",
		});

		expect(result.ok).toBe(true);
		expect(hrOrganizationMocks.createDepartment).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-organization-test",
				code: "ENG",
				name: "Engineering",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("uses organization.read for getOrganizationTreeAction", async () => {
		const result = await getOrganizationTreeAction({});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.organization.read",
		);
		expect(hrOrganizationMocks.getOrganizationTree).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("stamps org and actor on assignEmploymentCalendarAction", async () => {
		const result = await assignEmploymentCalendarAction({
			employeeId,
			employmentId,
			calendarId,
			effectiveFrom: "2026-01-01",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.calendar.manage",
		);
		expect(hrOrganizationMocks.assignEmploymentCalendar).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				employeeId,
				employmentId,
				calendarId,
				effectiveFrom: "2026-01-01",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});

	it("uses calendar.read for resolveEmployeeWorkCalendarAction", async () => {
		const result = await resolveEmployeeWorkCalendarAction({
			employeeId,
			employmentId,
			asOf: "2026-01-15",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.time.calendar.read",
		);
		expect(
			hrOrganizationMocks.resolveEmployeeWorkCalendar,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				employeeId,
				employmentId,
				asOf: "2026-01-15",
			}),
			expect.objectContaining({ authorization: expect.any(Object) }),
		);
	});
});
